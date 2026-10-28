import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CANAL_RECORDATORIOS = 'recordatorios-colectivos';

// Permite mostrar el aviso también cuando la app está abierta.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationsService = {
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL_RECORDATORIOS, {
        name: 'Recordatorios de colectivos',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;

    const solicitado = await Notifications.requestPermissionsAsync();
    return solicitado.granted;
  },

  /** Programa un recordatorio 10 minutos antes de la hora de tabla (HH:mm). */
  async programarAvisoArribo(
    lineaNumero: string,
    nombreParada: string,
    horaProgramada: string
  ): Promise<string | null> {
    const permitido = await this.requestPermissions();
    if (!permitido) return null;

    const partes = horaProgramada.split(':');
    const hora = Number(partes[0]);
    const minuto = Number(partes[1]);

    if (
      partes.length !== 2 ||
      !Number.isInteger(hora) ||
      !Number.isInteger(minuto) ||
      hora < 0 || hora > 23 ||
      minuto < 0 || minuto > 59
    ) {
      throw new Error('El horario del colectivo no es válido.');
    }

    const ahora = new Date();
    const fechaArribo = new Date(ahora);
    fechaArribo.setHours(hora, minuto, 0, 0);

    // Este widget muestra los próximos arribos del día actual.
    if (fechaArribo.getTime() <= ahora.getTime()) {
      throw new Error('El horario de ese colectivo ya pasó.');
    }

    const fechaAviso = new Date(fechaArribo.getTime() - 10 * 60 * 1000);

    if (fechaAviso.getTime() <= ahora.getTime()) {
      throw new Error(
        'Faltan 10 minutos o menos para ese colectivo; no se puede programar el recordatorio.'
      );
    }

    const horaTexto = fechaArribo.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return Notifications.scheduleNotificationAsync({
      content: {
        title: `Recordatorio - Línea ${lineaNumero}`,
        body: `Según el horario publicado, el colectivo pasa a las ${horaTexto} en "${nombreParada}".`,
        sound: 'default',
        data: { lineaNumero, nombreParada, horaProgramada },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fechaAviso,
        channelId: CANAL_RECORDATORIOS,
      },
    });
  },

  async cancelarAvisoArribo(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },
};
