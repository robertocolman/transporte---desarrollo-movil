import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@/config/api';

const TOKEN_KEY = 'user_auth_token';

export const authService = {
  // Guardar el token para mantener la sesion
  saveToken: async (token: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error al guardar el token:', error);
    }
  },

  // Obtener el token guardado
  getToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error al obtener el token:', error);
      return null;
    }
  },

  // Cerrar sesion y borrar token (logout)
  removeToken: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error al eliminar el token:', error);
    }
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
          password,
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
      await authService.saveToken(data.datos.token);
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
          password,
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

};

