import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Storage from 'expo-sqlite/kv-store';

const CANAL_RECORDATORIOS = 'recordatorios-colectivos';
const PREFIJO_RECORDATORIO = 'recordatorio_arribo:';
const DIEZ_MINUTOS_MS = 10 * 60 * 1000;

type ModuloNotificaciones = typeof import('expo-notifications');
let moduloNotificaciones: Promise<ModuloNotificaciones> | null = null;
let handlerConfigurado = false;

function esExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function obtenerNotificaciones(): Promise<ModuloNotificaciones> {
  if (Platform.OS === 'web') {
    throw new Error('Los recordatorios solo están disponibles en el teléfono.');
  }

  if (!moduloNotificaciones) {
    moduloNotificaciones = import('expo-notifications');
  }

  let Notifications: ModuloNotificaciones;
  try {
    Notifications = await moduloNotificaciones;
  } catch {
    moduloNotificaciones = null;
    throw new Error('No se pudo iniciar el servicio de notificaciones en este dispositivo.');
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

function fechaDeHorario(horaProgramada: string, esManiana: boolean): Date {
  const partes = horaProgramada.split(':');
  const hora = Number(partes[0]);
  const minuto = Number(partes[1]);

  if (
    partes.length !== 2 ||
    !/^\d{1,2}$/.test(partes[0]) ||
    !/^\d{2}$/.test(partes[1]) ||
    !Number.isInteger(hora) || !Number.isInteger(minuto) ||
    hora < 0 || hora > 23 || minuto < 0 || minuto > 59
  ) {
    throw new Error('El horario del colectivo no es válido.');
  }

  const fecha = new Date();
  if (esManiana) fecha.setDate(fecha.getDate() + 1);
  fecha.setHours(hora, minuto, 0, 0);
  return fecha;
}

function claveAlmacenamiento(
  lineaNumero: string,
  nombreParada: string,
  fechaArribo: Date
): string {
  return `${PREFIJO_RECORDATORIO}${JSON.stringify([
    lineaNumero,
    nombreParada,
    fechaArribo.getTime(),
  ])}`;
}

interface RecordatorioGuardado {
  id: string;
  fechaAvisoMs: number;
}

async function leerRespaldo(clave: string): Promise<string | null> {
  try {
    const valor = await Storage.getItem(clave);
    if (!valor) return null;
    const recordatorio = JSON.parse(valor) as RecordatorioGuardado;
    if (
      typeof recordatorio.id !== 'string' ||
      !Number.isFinite(recordatorio.fechaAvisoMs) ||
      recordatorio.fechaAvisoMs <= Date.now()
    ) {
      await Storage.removeItem(clave);
      return null;
    }
    return recordatorio.id;
  } catch {
    return null;
  }
}

async function guardarRespaldo(
  clave: string,
  id: string,
  fechaAvisoMs: number
): Promise<void> {
  try {
    await Storage.setItem(clave, JSON.stringify({ id, fechaAvisoMs }));
  } catch {
    // El sistema de notificaciones sigue siendo la fuente de verdad.
  }
}

export const notificationsService = {
  async requestPermissions(): Promise<boolean> {
    const Notifications = await obtenerNotificaciones();

    if (Platform.OS === 'android' && !esExpoGo()) {
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

  async buscarAvisoArribo(
    lineaNumero: string,
    nombreParada: string,
    horaProgramada: string,
    esManiana = false
  ): Promise<string | null> {
    const fechaArribo = fechaDeHorario(horaProgramada, esManiana);
    const fechaAvisoMs = fechaArribo.getTime() - DIEZ_MINUTOS_MS;
    const clave = claveAlmacenamiento(lineaNumero, nombreParada, fechaArribo);
    if (fechaAvisoMs <= Date.now()) return null;

    const respaldo = await leerRespaldo(clave);
    try {
      const Notifications = await obtenerNotificaciones();
      const pendientes = await Notifications.getAllScheduledNotificationsAsync();
      const existente = pendientes.find((notificacion) => {
        const data = notificacion.content.data;
        if (
          data?.tipo !== 'recordatorio-arribo' ||
          data?.lineaNumero !== lineaNumero ||
          data?.nombreParada !== nombreParada ||
          data?.horaProgramada !== horaProgramada
        ) return false;

        // Compatibilidad con recordatorios anteriores, programados para hoy.
        return data.fechaArriboIso === fechaArribo.toISOString() ||
          (!data.fechaArriboIso && !esManiana);
      });

      if (existente) {
        await guardarRespaldo(clave, existente.identifier, fechaAvisoMs);
        return existente.identifier;
      }

      try { await Storage.removeItem(clave); } catch {}
      return null;
    } catch {
      // Si Expo Go no permite consultar los pendientes, usamos el último ID guardado.
      return respaldo;
    }
  },

  async programarAvisoArribo(
    lineaNumero: string,
    nombreParada: string,
    horaProgramada: string,
    esManiana = false
  ): Promise<string | null> {
    const fechaArribo = fechaDeHorario(horaProgramada, esManiana);
    const ahora = Date.now();
    if (fechaArribo.getTime() <= ahora) {
      throw new Error('El horario de ese colectivo ya pasó.');
    }

    const fechaAvisoMs = fechaArribo.getTime() - DIEZ_MINUTOS_MS;
    if (fechaAvisoMs <= ahora) {
      throw new Error('Faltan 10 minutos o menos: ya no se puede programar ese aviso.');
    }

    const permitido = await this.requestPermissions();
    if (!permitido) return null;

    const existente = await this.buscarAvisoArribo(
      lineaNumero, nombreParada, horaProgramada, esManiana
    );
    if (existente) return existente;

    const Notifications = await obtenerNotificaciones();
    const horaTexto = fechaArribo.toLocaleTimeString('es-AR', {
      hour: '2-digit', minute: '2-digit',
    });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Recordatorio - Línea ${lineaNumero}`,
        body: `Según la tabla, el colectivo pasa a las ${horaTexto} en "${nombreParada}".`,
        sound: 'default',
        data: {
          tipo: 'recordatorio-arribo',
          lineaNumero,
          nombreParada,
          horaProgramada,
          fechaArriboIso: fechaArribo.toISOString(),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fechaAvisoMs),
        ...(!esExpoGo() && Platform.OS === 'android'
          ? { channelId: CANAL_RECORDATORIOS }
          : {}),
      },
    });

    await guardarRespaldo(
      claveAlmacenamiento(lineaNumero, nombreParada, fechaArribo),
      id,
      fechaAvisoMs
    );
    return id;
  },

  async cancelarAvisoArribo(
    notificationId: string,
    lineaNumero?: string,
    nombreParada?: string,
    horaProgramada?: string,
    esManiana = false
  ): Promise<void> {
    const Notifications = await obtenerNotificaciones();
    await Notifications.cancelScheduledNotificationAsync(notificationId);

    if (lineaNumero && nombreParada && horaProgramada) {
      const fechaArribo = fechaDeHorario(horaProgramada, esManiana);
      try {
        await Storage.removeItem(
          claveAlmacenamiento(lineaNumero, nombreParada, fechaArribo)
        );
      } catch {}
    }
  },
};
