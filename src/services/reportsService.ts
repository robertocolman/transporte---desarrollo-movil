
import * as SQLite from 'expo-sqlite';
import { ReporteDeDemora, MotivoDemora } from '../types';
import * as Network from 'expo-network';
import { enviarReporteApi, ErrorApi } from './reportsApiService';
import { obtenerUsuarioReportes } from './reportUserService';

// datos para el reporte
export interface NuevoReporte {
  lineaId: string;
  paradaId: string;
  usuarioId: string;
  motivo: MotivoDemora;
  comentario: string | null;
  fotoUri: string;
}

const dbPromise = SQLite.openDatabaseAsync('reportes.db');

// tabla

async function obtenerDB() {
  const db = await dbPromise;

  // Creamos la tabla si todavía no existe.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reportes (
      id TEXT PRIMARY KEY NOT NULL,
      lineaId TEXT NOT NULL,
      paradaId TEXT NOT NULL,
      usuarioId TEXT NOT NULL,
      motivo TEXT NOT NULL,
      comentario TEXT,
      fotoUri TEXT NOT NULL,
      fotoUrlRemota TEXT,
      confirmaciones INTEGER NOT NULL DEFAULT 0,
      fechaHora TEXT NOT NULL,
      sincronizado INTEGER NOT NULL DEFAULT 0,
      estadoEnvio TEXT NOT NULL DEFAULT 'pendiente'
    );
  `);

  // Revisamos las columnas de una tabla existente.
  const columnas = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(reportes)'
  );

  const tieneEstado = columnas.some(
    (columna) => columna.name === 'estadoEnvio'
  );

  // Actualizamos las instalaciones anteriores sin borrar reportes.
  if (!tieneEstado) {
    await db.execAsync(`
      ALTER TABLE reportes
      ADD COLUMN estadoEnvio TEXT NOT NULL DEFAULT 'pendiente';
    `);
  }

  const tieneFotoRemota = columnas.some(
    (columna) => columna.name === 'fotoUrlRemota'
  );

  if (!tieneFotoRemota) {
    await db.execAsync(`
      ALTER TABLE reportes
      ADD COLUMN fotoUrlRemota TEXT;
    `);
  }

  // Corregimos registros anteriores que ya estaban sincronizados.
  await db.runAsync(`
    UPDATE reportes
    SET estadoEnvio = 'sincronizado'
    WHERE sincronizado = 1
      AND estadoEnvio = 'pendiente'
  `);

  return db;
}


export async function crearReporteLocal(
  datos: NuevoReporte
): Promise<ReporteDeDemora> {

  const db = await obtenerDB();

  const reporte: ReporteDeDemora = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    lineaId: datos.lineaId,
    paradaId: datos.paradaId,
    usuarioId: datos.usuarioId,
    motivo: datos.motivo,
    comentario: datos.comentario,
    fotoUri: datos.fotoUri,
    confirmaciones: 0,
    fechaHora: new Date().toISOString(),
    sincronizado: false,
  };

  await db.runAsync(
    `INSERT INTO reportes
    (id, lineaId, paradaId, usuarioId, motivo,
     comentario, fotoUri, confirmaciones, fechaHora, sincronizado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reporte.id,
      reporte.lineaId,
      reporte.paradaId,
      reporte.usuarioId,
      reporte.motivo,
      reporte.comentario,
      reporte.fotoUri,
      reporte.confirmaciones,
      reporte.fechaHora,
      0,
    ]
  );

  return reporte;
}


export type EstadoEnvio = 'pendiente' | 'sincronizado' | 'rechazado';

export type ReporteLocal = ReporteDeDemora & {
  estadoEnvio: EstadoEnvio;
};

export async function listarReportesDeParada(
  paradaId: string
): Promise<ReporteLocal[]> {
  const db = await obtenerDB();

  const filas = await db.getAllAsync<
    Omit<ReporteLocal, 'sincronizado'> & {
      sincronizado: number;
    }
  >(
    `SELECT * FROM reportes
     WHERE paradaId = ?
     ORDER BY fechaHora DESC`,
    [paradaId]
  );

  return filas.map((fila) => ({
    ...fila,
    sincronizado: Boolean(fila.sincronizado),
  }));
}


export async function confirmarReporteLocal(
  reporteId: string
): Promise<void> {

  const db = await obtenerDB();

  await db.runAsync(
    `UPDATE reportes
     SET confirmaciones = confirmaciones + 1
     WHERE id = ?`,
    [reporteId]
  );
}

export async function listarReportesPendientes():
  Promise<ReporteDeDemora[]> {

  const db = await obtenerDB();

  const filas = await db.getAllAsync<
  Omit<ReporteDeDemora, 'sincronizado'> & {
    sincronizado: number;
  }
  >(
    `SELECT * FROM reportes
     WHERE sincronizado = 0
     AND estadoEnvio = 'pendiente'
     ORDER BY fechaHora ASC`
  );

  return filas.map((fila) => ({
    ...fila,
    sincronizado: false,
  }));
}

export async function marcarReporteSincronizado(
  reporteId: string
): Promise<void> {
  const db = await obtenerDB();

  await db.runAsync(
    `UPDATE reportes
     SET sincronizado = 1,
         estadoEnvio = 'sincronizado'
     WHERE id = ?`,
    [reporteId]
  );
}

export async function marcarReporteRechazado(
  reporteId: string
): Promise<void> {
  const db = await obtenerDB();

  await db.runAsync(
    `UPDATE reportes
     SET estadoEnvio = 'rechazado'
     WHERE id = ?`,
    [reporteId]
  );
}

let sincronizando = false;


export async function sincronizarReportesPendientes(): Promise<void> {

  if (sincronizando) return;

  sincronizando = true;

  try {
    const estadoRed = await Network.getNetworkStateAsync();

    // si no hay onternet conservar los reportes pendientes.
    if (
      !estadoRed.isConnected ||
      estadoRed.isInternetReachable === false
    ) {
      return;
    }

    
    // Obtenemos el usuario de la sesión actual.
    let usuarioId: string;

    try {
      usuarioId = await obtenerUsuarioReportes();
    } catch (error) {
      // Si no hay una sesión válida, no intentamos enviar reportes.
      console.warn(
        'No se pueden sincronizar reportes sin una sesión válida.',
        error
      );
      return;
    }

    // Recuperamos solamente los reportes de este usuario.
    const todosPendientes = await listarReportesPendientes();

    const pendientes = todosPendientes.filter(
      (reporte) => reporte.usuarioId === usuarioId
    );


    for (const reporte of pendientes) {
      try {
        // primero se sube la foto y después se envía el reporte
        
        const fotoUrlExistente = await obtenerFotoRemota(reporte.id);

        await enviarReporteApi(
          {
            id: reporte.id,
            lineaId: reporte.lineaId,
            paradaId: reporte.paradaId,
            motivo: reporte.motivo,
            comentario: reporte.comentario,
            fotoUri: reporte.fotoUri!,
            fechaHora: reporte.fechaHora,
          },
          fotoUrlExistente ?? undefined,
          async (url) => {
            await guardarFotoRemota(reporte.id, url);
          }
        );

        await marcarReporteSincronizado(reporte.id);
      } catch (error) {
        if (error instanceof ErrorApi) {
          if (error.estado === 401 || error.estado === 403) {
            // La sesión no es válida o no tiene permisos.
            // Conservamos el reporte y detenemos la sincronización.
            console.warn('Se necesita una sesión válida para sincronizar.');
            break;
          }

          if (error.estado === 408 || error.estado === 429) {
            // Son errores temporales.
            // Conservamos el reporte para intentarlo más adelante.
            console.warn(
              `Error temporal al enviar el reporte ${reporte.id}: ${error.message}`
            );
            break;
          }

          if (error.estado >= 400 && error.estado < 500) {
            // El servidor rechazó el reporte.
            // Lo guardamos como rechazado para no reenviarlo automáticamente.
            await marcarReporteRechazado(reporte.id);

            console.warn(
              `Reporte ${reporte.id} rechazado: ${error.message}`
            );

            continue;
          }

        }

        // Problemas de conexión o errores del servidor:
        // conservamos el reporte para reintentarlo.
        console.error(
          `No se pudo sincronizar el reporte ${reporte.id}:`,
          error
        );

        break;
      }
    }
  } finally {

    sincronizando = false;
  }
}

export async function guardarFotoRemota(
  reporteId: string,
  fotoUrl: string
): Promise<void> {
  const db = await obtenerDB();

  await db.runAsync(
    `UPDATE reportes
     SET fotoUrlRemota = ?
     WHERE id = ?`,
    [fotoUrl, reporteId]
  );
}

export async function obtenerFotoRemota(
  reporteId: string
): Promise<string | null> {
  const db = await obtenerDB();

  const resultado = await db.getFirstAsync<{
    fotoUrlRemota: string | null;
  }>(
    `SELECT fotoUrlRemota
     FROM reportes
     WHERE id = ?`,
    [reporteId]
  );

  return resultado?.fotoUrlRemota ?? null;
}



