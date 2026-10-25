
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CANAL_RECORDATORIOS = 'recordatorios-colectivos';

// Mostrar la notificación también si la app está abierta.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  // Preparar Android y solicitar permiso cuando el usuario
  // decida crear un recordatorio.
  preparar: async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(
        CANAL_RECORDATORIOS,
        {
          name: 'Recordatorios de colectivos',
          importance: Notifications.AndroidImportance.HIGH,
        }
      );
    }

    const permisoActual =
      await Notifications.getPermissionsAsync();

    if (permisoActual.granted) return true;

    const permisoNuevo =
      await Notifications.requestPermissionsAsync();

    return permisoNuevo.granted;
  },

  // Recibe el horario real del colectivo.
  programarRecordatorio: async (
    linea: string,
    horarioColectivo: Date
  ): Promise<string> => {
    const fechaAviso = new Date(
      horarioColectivo.getTime() - 10 * 60 * 1000
    );

    if (fechaAviso.getTime() <= Date.now()) {
      throw new Error(
        'Ya faltan menos de 10 minutos para ese colectivo.'
      );
    }

    const permitido = await notificationService.preparar();

    if (!permitido) {
      throw new Error(
        'Necesitás permitir las notificaciones.'
      );
    }

    const hora = horarioColectivo.toLocaleTimeString(
      'es-AR',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `Recordatorio: ${linea}`,
        body: `Según el horario publicado, el colectivo pasa a las ${hora}.`,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fechaAviso,
        channelId: CANAL_RECORDATORIOS,
      },
    });
  },

  // Permite cancelar un recordatorio usando su ID.
  cancelarRecordatorio: async (id: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(id);
  },
};
