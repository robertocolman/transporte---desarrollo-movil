import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@/config/api';
import { biometricService } from './biometricService';
import Storage from 'expo-sqlite/kv-store';

const TOKEN_KEY = 'user_auth_token';

export const authService = {
  saveToken: async (token: string): Promise<void> => {
    // Eliminamos el ID de la cuenta anterior.
    await Storage.removeItem('report_user_id');

    await SecureStore.setItemAsync(TOKEN_KEY, token);
    biometricService.desbloquearSesion();
  },

  getToken: async (): Promise<string | null> => {
    try {
      const biometriaActiva =
        await biometricService.estaActivada();

      if (
        biometriaActiva &&
        !biometricService.estaDesbloqueada()
      ) {
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

    // Eliminamos el ID local al cerrar sesión.
    await Storage.removeItem('report_user_id');

    await biometricService.limpiarSesion();
  },

  // Iniciar sesion con email y contraseña
  login: async (email: string, password: string) => {
    const response = await fetch(
      `${API_URL}/auth/ingreso`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          contrasena: password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.mensaje ||
        'Error al iniciar sesión'
      );
    }

    if (data.datos?.token) {
      await biometricService.limpiarSesion();
      await authService.saveToken(data.datos.token);

      try {
        const respuestaUsuario = await authService.getCurrentUser();

        if (respuestaUsuario.datos?.id) {
          await Storage.setItem(
            'report_user_id',
            respuestaUsuario.datos.id
          );
        }
      } catch (error) {
        console.warn(
          'No se pudo guardar el usuario para reportes offline:',
          error
        );
      }
    }

    return data;
  },

  // Registrar un nuevo usuario
  register: async (
    nombre: string,
    email: string,
    password: string
  ) => {
    const response = await fetch(
      `${API_URL}/auth/registro`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre,
          email,
          contrasena: password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.mensaje ||
        'Error al registrar usuario'
      );
    }

    if (data.datos?.token) {
      await biometricService.limpiarSesion();
      await authService.saveToken(data.datos.token);

      try {
        const respuestaUsuario = await authService.getCurrentUser();

        if (respuestaUsuario.datos?.id) {
          await Storage.setItem(
            'report_user_id',
            respuestaUsuario.datos.id
          );
        }
      } catch (error) {
        console.warn(
          'No se pudo guardar el usuario para reportes offline:',
          error
        );
      }
    }

    return data;
  },
  
  
  // Obtener los datos del usuario logueado
  getCurrentUser: async () => {
    const token = await authService.getToken();

    if (!token) {
      throw new Error('No hay sesión iniciada');
    }

    const response = await fetch(
      `${API_URL}/yo`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.mensaje ||
        'No se pudo obtener el usuario'
      );
    }

    return data;
  },
  tieneSesionGuardada: async (): Promise<boolean> => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return !!token;
  },

};

