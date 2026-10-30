import * as SQLite from 'expo-sqlite';
import { API_URL } from '@/config/api';
import { ApiErrorResponse } from '@/types';

const DB_NAME = 'transporte_parana.db';

let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export type SyncResourceKey =
  | 'paradas'
  | 'lineas'
  | 'avisos'
  | 'horarios'
  | 'feriados';

type SyncListener = () => void;
const syncListeners = new Set<SyncListener>();

export function subscribeSyncUpdates(listener: SyncListener): () => void {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

function notifySyncListeners() {
  for (const listener of syncListeners) {
    try {
      listener();
    } catch {
      // Ignorar errores de suscriptores de UI
    }
  }
}

/**
 * Abre e inicializa (una única vez) la base SQLite compartida de la aplicación.
 * Evita bloqueos de concurrencia al compartir tablas de caché offline entre servicios.
 */
export function getLocalDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_meta (
          recurso TEXT PRIMARY KEY NOT NULL,
          actualizadoEn TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS paradas_cache (
          id TEXT PRIMARY KEY NOT NULL,
          orden INTEGER NOT NULL,
          payload TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lineas_cache (
          id TEXT PRIMARY KEY NOT NULL,
          orden INTEGER NOT NULL,
          payload TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS avisos_cache (
          id TEXT PRIMARY KEY NOT NULL,
          orden INTEGER NOT NULL,
          payload TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS horarios (
          id TEXT PRIMARY KEY NOT NULL,
          lineaId TEXT NOT NULL,
          paradaId TEXT NOT NULL,
          sentido TEXT NOT NULL,
          tipoDeDia TEXT NOT NULL,
          hora TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_horarios_parada
          ON horarios (paradaId, tipoDeDia, lineaId);

        CREATE INDEX IF NOT EXISTS idx_horarios_linea
          ON horarios (lineaId, tipoDeDia);

        CREATE TABLE IF NOT EXISTS feriados_cache (
          fecha TEXT PRIMARY KEY NOT NULL,
          nombre TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbInitPromise;
}

/**
 * Extrae el instante oficial desde la cabecera HTTP `Date` del servidor (Regla R17),
 * o usa el reloj local si la cabecera no está disponible.
 */
export function extractServerTimestamp(headers?: Headers): string {
  const rawDate = headers?.get('date');
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

export async function setSyncTimestamp(
  recurso: string,
  isoTimestamp: string
): Promise<void> {
  const db = await getLocalDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_meta (recurso, actualizadoEn) VALUES (?, ?);`,
    [recurso, isoTimestamp]
  );
  notifySyncListeners();
}

export async function getSyncTimestamp(recurso: string): Promise<string | null> {
  const db = await getLocalDb();
  const row = await db.getFirstAsync<{ actualizadoEn: string }>(
    `SELECT actualizadoEn FROM sync_meta WHERE recurso = ?;`,
    [recurso]
  );
  return row?.actualizadoEn ?? null;
}

export async function getLatestSyncTimestamp(
  recursos: SyncResourceKey[] = ['paradas', 'lineas', 'horarios', 'feriados']
): Promise<string | null> {
  if (recursos.length === 0) return null;
  const db = await getLocalDb();
  const placeholders = recursos.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ actualizadoEn: string }>(
    `SELECT actualizadoEn FROM sync_meta WHERE recurso IN (${placeholders});`,
    recursos
  );

  let latestMs = -1;
  let latestIso: string | null = null;
  for (const row of rows) {
    const ms = new Date(row.actualizadoEn).getTime();
    if (!Number.isNaN(ms) && ms > latestMs) {
      latestMs = ms;
      latestIso = row.actualizadoEn;
    }
  }
  return latestIso;
}

/**
 * Formatea una antigüedad legible para avisarle al pasajero cuán vieja es la copia local.
 */
export function formatRelativeSyncAge(
  isoTimestamp: string | null,
  ahora: Date = new Date()
): string {
  if (!isoTimestamp) {
    return 'sin datos descargados todavía';
  }

  const syncDate = new Date(isoTimestamp);
  if (Number.isNaN(syncDate.getTime())) {
    return 'con fecha desconocida';
  }

  const diffMs = Math.max(0, ahora.getTime() - syncDate.getTime());
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'actualizada recién';
  if (diffMin === 1) return 'de hace 1 minuto';
  if (diffMin < 60) return `de hace ${diffMin} minutos`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return 'de hace 1 hora';
  if (diffHours < 24) return `de hace ${diffHours} horas`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'de hace 1 día';
  return `de hace ${diffDays} días`;
}

export class ApiHttpError extends Error {
  status: number;
  codigo: string;

  constructor(status: number, codigo: string, mensaje: string) {
    super(mensaje);
    this.name = 'ApiHttpError';
    this.status = status;
    this.codigo = codigo;
  }
}

/**
 * Realiza una petición GET/JSON tipada hacia la API oficial con timeout y lectura de cabecera `Date`.
 */
export async function fetchApiJson<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<{ payload: T; serverTimeIso: string }> {
  const { timeoutMs = 10000, headers, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(headers || {}),
      },
      signal: controller.signal,
    });

    const serverTimeIso = extractServerTimestamp(response.headers);

    if (!response.ok) {
      let codigo = `HTTP_${response.status}`;
      let mensaje = `Error del servidor (${response.status}).`;

      try {
        const errBody = (await response.json()) as Partial<ApiErrorResponse>;
        if (errBody?.error?.mensaje) {
          mensaje = errBody.error.mensaje;
        }
        if (errBody?.error?.codigo) {
          codigo = errBody.error.codigo;
        }
      } catch {
        // Cuerpo no JSON
      }

      throw new ApiHttpError(response.status, codigo, mensaje);
    }

    const payload = (await response.json()) as T;
    return { payload, serverTimeIso };
  } finally {
    clearTimeout(timeoutId);
  }
}
