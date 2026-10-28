import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

import { API_URL } from '@/config/api';
import { authService } from '@/services/authService';

const TOKEN_PUSH_KEY = 'expo_push_token_registrado';
const USUARIO_PUSH_KEY = 'expo_push_usuario_registrado';
const CANAL_PUSH = 'avisos-transporte';

export const pushNotificationService = {
  async registrar(usuarioId: string): Promise<boolean> {
    if (Constants.appOwnership === 'expo' || !Device.isDevice) {
      return false;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('Falta configurar el projectId de EAS para las notificaciones push.');
      return false;
    }

    const tokenSesion = await authService.getToken();
    if (!tokenSesion) return false;

    const usuarioAnterior = await SecureStore.getItemAsync(USUARIO_PUSH_KEY);
    const tokenAnterior = await SecureStore.getItemAsync(TOKEN_PUSH_KEY);

    if (usuarioAnterior === usuarioId && tokenAnterior) {
      return true;
    }

    // No podemos transferir un registro viejo a otra cuenta sin confirmar la baja.
    if (tokenAnterior && usuarioAnterior !== usuarioId) {
      try {
        await this.desregistrar();
      } catch (error) {
        console.error('No se pudo dar de baja el registro push anterior:', error);
        return false;
      }
    }

    // Carga diferida: evita evaluar el módulo nativo al abrir Perfil en Expo Go.
    // En la APK/development build compatible, se carga para registrar las push.
    const Notifications = await import('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL_PUSH, {
        name: 'Avisos del transporte',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) {
      permiso = await Notifications.requestPermissionsAsync();
    }
    if (!permiso.granted) return false;

    const resultado = await Notifications.getExpoPushTokenAsync({ projectId });
    const tokenExpo = resultado.data;

    const respuesta = await fetch(`${API_URL}/dispositivos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenSesion}`,
      },
      body: JSON.stringify({
        tokenExpo,
        plataforma: Platform.OS,
      }),
    });

    if (!respuesta.ok) {
      throw new Error(`No se pudo registrar el dispositivo (${respuesta.status}).`);
    }

    await SecureStore.setItemAsync(TOKEN_PUSH_KEY, tokenExpo);
    await SecureStore.setItemAsync(USUARIO_PUSH_KEY, usuarioId);
    return true;
  },

  async desregistrar(): Promise<void> {
    const tokenExpo = await SecureStore.getItemAsync(TOKEN_PUSH_KEY);
    if (!tokenExpo) return;

    const tokenSesion = await authService.getToken();
    if (!tokenSesion) {
      throw new Error('No hay sesión válida para dar de baja el dispositivo.');
    }

    const respuesta = await fetch(
      `${API_URL}/dispositivos/${encodeURIComponent(tokenExpo)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenSesion}` },
      }
    );

    if (!respuesta.ok && respuesta.status !== 404) {
      throw new Error(`No se pudo dar de baja el dispositivo (${respuesta.status}).`);
    }

    await SecureStore.deleteItemAsync(TOKEN_PUSH_KEY);
    await SecureStore.deleteItemAsync(USUARIO_PUSH_KEY);
  },
};
