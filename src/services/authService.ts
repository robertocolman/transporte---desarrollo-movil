import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'user_auth_token';

export const authService = {
  // Guardar el token JWT de forma segura en el dispositivo
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

  // Eliminar el token al cerrar sesión (Logout)
  removeToken: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error al eliminar el token:', error);
    }
  },
};