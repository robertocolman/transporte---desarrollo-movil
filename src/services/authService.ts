import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';
import { API_URL } from '@/config/api';
import { biometricService } from './biometricService';

const TOKEN_KEY = 'user_auth_token';
const TIEMPO_LIMITE_MS = 12000;

async function solicitarApi(url: string, opciones?: RequestInit): Promise<Response> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);

  try {
    return await fetch(url, { ...opciones, signal: controlador.signal });
  } catch {
    if (controlador.signal.aborted) {
      throw new Error('El servidor tardó demasiado en responder. Volvé a intentarlo.');
    }
    throw new Error('No se pudo conectar con la API. Revisá la conexión y que el backend esté iniciado.');
  } finally {
    clearTimeout(temporizador);
  }
}

async function leerRespuesta(response: Response, mensajeError: string) {
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(response.ok
      ? 'El servidor devolvió una respuesta no válida.'
      : mensajeError);
  }

  if (!response.ok) {
    throw new Error(data?.error?.mensaje || mensajeError);
  }
  return data;
}

export const authService = {
  saveToken: async (token: string): Promise<void> => {
    await Storage.removeItem('report_user_id');
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    biometricService.desbloquearSesion();
  },

  getToken: async (): Promise<string | null> => {
    try {
      const biometriaActiva = await biometricService.estaActivada();
      if (biometriaActiva && !biometricService.estaDesbloqueada()) {
        return null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error al obtener el token:', error);
      return null;
    }
  },

  removeToken: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await Storage.removeItem('report_user_id');
    await biometricService.limpiarSesion();
  },

  login: async (email: string, password: string) => {
    if (!email.trim() || !password) {
      throw new Error('Completá el correo y la contraseña.');
    }

    const response = await solicitarApi(`${API_URL}/auth/ingreso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), contrasena: password }),
    });
    const data = await leerRespuesta(response, 'Error al iniciar sesión.');

    if (!data?.datos?.token) {
      throw new Error('El servidor no devolvió un token de sesión válido.');
    }

    await biometricService.limpiarSesion();
    await authService.saveToken(data.datos.token);

    try {
      const respuestaUsuario = await authService.getCurrentUser();
      if (respuestaUsuario.datos?.id) {
        await Storage.setItem('report_user_id', respuestaUsuario.datos.id);
      }
    } catch (error) {
      console.warn('No se pudo guardar el usuario para reportes offline:', error);
    }
    return data;
  },

  register: async (nombre: string, email: string, password: string) => {
    if (!nombre.trim() || !email.trim() || !password) {
      throw new Error('Completá nombre, correo y contraseña.');
    }

    const response = await solicitarApi(`${API_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), contrasena: password }),
    });
    const data = await leerRespuesta(response, 'Error al registrar usuario.');

    if (!data?.datos?.token) {
      throw new Error('La cuenta se creó, pero el servidor no devolvió un token. Iniciá sesión.');
    }

    await biometricService.limpiarSesion();
    await authService.saveToken(data.datos.token);

    try {
      const respuestaUsuario = await authService.getCurrentUser();
      if (respuestaUsuario.datos?.id) {
        await Storage.setItem('report_user_id', respuestaUsuario.datos.id);
      }
    } catch (error) {
      console.warn('No se pudo guardar el usuario para reportes offline:', error);
    }
    return data;
  },

  getCurrentUser: async () => {
    const token = await authService.getToken();
    if (!token) throw new Error('No hay sesión iniciada');

    const response = await solicitarApi(`${API_URL}/yo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return leerRespuesta(response, 'No se pudo obtener el usuario.');
  },

  tieneSesionGuardada: async (): Promise<boolean> => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return !!token;
  },

  toggleFavorito: async (
    tipo: 'parada' | 'linea', id: string, agregar: boolean
  ): Promise<void> => {
    const token = await authService.getToken();
    if (!token) throw new Error('No hay sesión iniciada');

    const recurso = tipo === 'parada' ? 'paradas-favoritas' : 'lineas-favoritas';
    const respuesta = await solicitarApi(
      `${API_URL}/yo/${recurso}/${encodeURIComponent(id)}`,
      {
        method: agregar ? 'PUT' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!respuesta.ok) throw new Error('No se pudo actualizar el favorito.');
  },

  updateAvisosActivos: async (avisosActivos: boolean): Promise<void> => {
    const token = await authService.getToken();
    if (!token) throw new Error('No hay sesión iniciada');

    const respuesta = await solicitarApi(`${API_URL}/yo`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ avisosActivos }),
    });
    if (!respuesta.ok) throw new Error('No se pudo actualizar la preferencia.');
  },
};
