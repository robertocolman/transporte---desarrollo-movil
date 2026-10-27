import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar cómo se presentan las notificaciones locales cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldPresentBanner: true,
    shouldPresentList: true,
  }),
});

export const notificationsService = {
  /**
   * Solicita permisos para emitir notificaciones locales en el dispositivo
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  },

  /**
   * Programa un recordatorio de arribo de colectivo (aviso 5 minutos antes o temporizado)
   */
  async programarAvisoArribo(
    lineaNumero: string,
    nombreParada: string,
    minutosRestantes: number
  ): Promise<string | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    // Si faltan más de 5 minutos, programamos para que avise 5 min antes.
    // Si faltan 5 min o menos, disparamos en 5 segundos a modo de confirmación inmediata.
    const segundosEspera = minutosRestantes > 5 ? (minutosRestantes - 5) * 60 : 5;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚌 ¡Colectivo en camino! Línea ${lineaNumero}`,
        body: `La unidad se aproxima a la parada "${nombreParada}". Tiempo estimado de llegada: ${minutosRestantes} minutos.`,
        sound: true,
        data: { lineaNumero, nombreParada, minutosRestantes },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(segundosEspera, 2),
        repeats: false,
      },
    });

    return notificationId;
  },
};
