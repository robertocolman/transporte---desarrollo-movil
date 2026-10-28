import { Platform } from 'react-native';
import Constants from 'expo-constants';

const CANAL_RECORDATORIOS = 'recordatorios-colectivos';

type ModuloNotificaciones = typeof import('expo-notifications');
let moduloNotificaciones: Promise<ModuloNotificaciones> | null = null;
let handlerConfigurado = false;


async function obtenerNotificaciones(): Promise<ModuloNotificaciones> {
  if (Platform.OS === 'web') {
    throw new Error('Los recordatorios se prueban en un teléfono, no en la web.');
  }

  if (!moduloNotificaciones) {
    moduloNotificaciones = import('expo-notifications');
  }

  let Notifications: ModuloNotificaciones;
  try {
    Notifications = await moduloNotificaciones;
  } catch (error) {
    moduloNotificaciones = null;
    throw new Error(
      'No se pudo cargar expo-notifications en este entorno. Probá con una APK compatible generada con EAS y revisá las versiones de Expo.'
    );
  }

  if (!handlerConfigurado) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigurado = true;
  }

  return Notifications;
}

function fechaDeHorario(horaProgramada: string): Date {
  const partes = horaProgramada.split(':');
  const hora = Number(partes[0]);
  const minuto = Number(partes[1]);

  if (
    partes.length !== 2 ||
    !/^\d{1,2}$/.test(partes[0]) ||
    !/^\d{2}$/.test(partes[1]) ||
    !Number.isInteger(hora) ||
    !Number.isInteger(minuto) ||
    hora < 0 || hora > 23 ||
    minuto < 0 || minuto > 59
  ) {
    throw new Error('El horario del colectivo no es válido.');
  }

  const fecha = new Date();
  fecha.setHours(hora, minuto, 0, 0);
  return fecha;
}

export const notificationsService = {
  async requestPermissions(): Promise<boolean> {
    const Notifications = await obtenerNotificaciones();

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

  /** Recupera del sistema un recordatorio pendiente, incluso tras reiniciar la app. */
  async buscarAvisoArribo(
    lineaNumero: string,
    nombreParada: string,
    horaProgramada: string
  ): Promise<string | null> {
    if (
      Platform.OS === 'android' &&
      Constants.appOwnership === 'expo'
    ) {
      return null;
    }

    const Notifications = await obtenerNotificaciones();
    const programadas = await Notifications.getAllScheduledNotificationsAsync();
    const existente = programadas.find((n) =>
      n.content.data?.tipo === 'recordatorio-arribo' &&
      n.content.data?.lineaNumero === lineaNumero &&
      n.content.data?.nombreParada === nombreParada &&
      n.content.data?.horaProgramada === horaProgramada
    );
    return existente?.identifier ?? null;
  },

  /** Programa el recordatorio 10 minutos antes del horario publicado de hoy. */
  async programarAvisoArribo(
    lineaNumero: string,
    nombreParada: string,
    horaProgramada: string
  ): Promise<string | null> {
    const ahora = new Date();
    const fechaArribo = fechaDeHorario(horaProgramada);
    if (fechaArribo.getTime() <= ahora.getTime()) {
      throw new Error('El horario de ese colectivo ya pasó.');
    }

    const fechaAviso = new Date(fechaArribo.getTime() - 10 * 60 * 1000);
    if (fechaAviso.getTime() <= ahora.getTime()) {
      throw new Error(
        'Faltan 10 minutos o menos para ese colectivo; no se puede programar el recordatorio.'
      );
    }

    const permitido = await this.requestPermissions();
    if (!permitido) return null;

    const Notifications = await obtenerNotificaciones();
    const existente = await this.buscarAvisoArribo(
      lineaNumero,
      nombreParada,
      horaProgramada
    );
    if (existente) return existente;

    const horaTexto = fechaArribo.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return Notifications.scheduleNotificationAsync({
      content: {
        title: `Recordatorio - Línea ${lineaNumero}`,
        body: `Según el horario publicado, el colectivo pasa a las ${horaTexto} en "${nombreParada}".`,
        sound: 'default',
        data: {
          tipo: 'recordatorio-arribo',
          lineaNumero,
          nombreParada,
          horaProgramada,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fechaAviso,
        channelId: CANAL_RECORDATORIOS,
      },
    });
  },

  async cancelarAvisoArribo(notificationId: string): Promise<void> {
    const Notifications = await obtenerNotificaciones();
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },
};
