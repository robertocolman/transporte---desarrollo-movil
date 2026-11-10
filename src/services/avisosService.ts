import { resolveApiAssetUrl } from '@/config/api';
import { Aviso, RespuestaLista, RespuestaUno } from '@/types';
import {
  ApiHttpError,
  fetchApiJson,
  getLocalDb,
  getSyncTimestamp,
  setSyncTimestamp,
} from '@/services/localDb';

/**
 * Resultado de consultar avisos junto con su "frescura":
 * - desdeCache: true si no hubo respuesta del servidor y se muestra la copia local de SQLite.
 * - actualizadoEn: instante (ISO) de la última sincronización exitosa con el servidor.
 */
export interface AvisosResultado {
  avisos: Aviso[];
  desdeCache: boolean;
  actualizadoEn: string | null;
}

function normalizeAvisoMedia(aviso: Aviso): Aviso {
  return {
    ...aviso,
    videoUrl: resolveApiAssetUrl(aviso.videoUrl),
  };
}

function isAvisoStillVigente(aviso: Aviso, nowMs = Date.now()): boolean {
  const desdeMs = new Date(aviso.desde).getTime();
  if (!Number.isNaN(desdeMs) && desdeMs > nowMs) return false;

  if (aviso.hasta) {
    const hastaMs = new Date(aviso.hasta).getTime();
    if (!Number.isNaN(hastaMs) && hastaMs <= nowMs) return false;
  }
  return true;
}

async function saveAvisosToCache(
  avisos: Aviso[],
  serverTimeIso: string
): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM avisos_cache;');
    for (let i = 0; i < avisos.length; i += 1) {
      const aviso = avisos[i];
      await db.runAsync(
        'INSERT OR REPLACE INTO avisos_cache (id, orden, payload) VALUES (?, ?, ?);',
        [aviso.id, i, JSON.stringify(aviso)]
      );
    }
  });
  await setSyncTimestamp('avisos', serverTimeIso);
}

async function readAvisosFromCache(): Promise<Aviso[]> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM avisos_cache ORDER BY orden ASC;'
  );
  const result: Aviso[] = [];
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.payload) as Aviso;
      if (isAvisoStillVigente(parsed)) {
        result.push(normalizeAvisoMedia(parsed));
      }
    } catch {
      // Ignorar fila inválida
    }
  }
  return result;
}

export const avisosService = {
  /**
   * Obtiene los avisos vigentes e informa si la lista proviene del servidor o del caché local,
   * para poder avisarle al pasajero cuando los datos pueden estar desactualizados.
   */
  async getAvisosConMeta(): Promise<AvisosResultado> {
    try {
      const { payload, serverTimeIso } = await fetchApiJson<
        RespuestaLista<Aviso>
      >('/avisos?estado=vigentes&porPagina=100');

      const normalizados = payload.datos.map(normalizeAvisoMedia);
      await saveAvisosToCache(normalizados, serverTimeIso);
      return {
        avisos: normalizados,
        desdeCache: false,
        actualizadoEn: serverTimeIso,
      };
    } catch (err) {
      const cached = await readAvisosFromCache();
      if (cached.length > 0) {
        return {
          avisos: cached,
          desdeCache: true,
          actualizadoEn: await getSyncTimestamp('avisos'),
        };
      }

      if (err instanceof ApiHttpError) {
        throw err;
      }
      throw new Error(
        'No se pudo conectar con el servidor para consultar los avisos vigentes.'
      );
    }
  },

  /**
   * Obtiene los avisos y desvíos vigentes desde la API oficial (`GET /avisos?estado=vigentes`).
   * Si no hay señal, devuelve la última copia vigente almacenada en SQLite.
   */
  async getAvisos(): Promise<Aviso[]> {
    const { avisos } = await this.getAvisosConMeta();
    return avisos;
  },

  /**
   * Obtiene los avisos vigentes que afectan a una línea específica (`GET /avisos?estado=vigentes&lineaId=...`).
   */
  async getAvisosByLinea(lineaId: string): Promise<Aviso[]> {
    try {
      const { payload } = await fetchApiJson<RespuestaLista<Aviso>>(
        `/avisos?estado=vigentes&lineaId=${encodeURIComponent(lineaId)}&porPagina=100`
      );
      return payload.datos.map(normalizeAvisoMedia);
    } catch {
      const cached = await readAvisosFromCache();
      return cached.filter((a) => a.lineaIds.includes(lineaId));
    }
  },

  /**
   * Obtiene el detalle de un aviso por su identificador (`GET /avisos/:id`).
   */
  async getAvisoById(id: string): Promise<Aviso | undefined> {
    try {
      const { payload } = await fetchApiJson<RespuestaUno<Aviso>>(
        `/avisos/${encodeURIComponent(id)}`
      );
      return normalizeAvisoMedia(payload.datos);
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 404) {
        return undefined;
      }
      const cached = await readAvisosFromCache();
      return cached.find((a) => a.id === id);
    }
  },
};
