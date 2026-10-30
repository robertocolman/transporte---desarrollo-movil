import { resolveApiAssetUrl } from '@/config/api';
import { Aviso, RespuestaLista, RespuestaUno } from '@/types';
import {
  ApiHttpError,
  fetchApiJson,
  getLocalDb,
  setSyncTimestamp,
} from '@/services/localDb';

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
   * Obtiene los avisos y desvíos vigentes desde la API oficial (`GET /avisos?estado=vigentes`).
   * Si no hay señal, devuelve la última copia vigente almacenada en SQLite.
   */
  async getAvisos(): Promise<Aviso[]> {
    try {
      const { payload, serverTimeIso } = await fetchApiJson<
        RespuestaLista<Aviso>
      >('/avisos?estado=vigentes&porPagina=100');

      const normalizados = payload.datos.map(normalizeAvisoMedia);
      await saveAvisosToCache(normalizados, serverTimeIso);
      return normalizados;
    } catch (err) {
      const cached = await readAvisosFromCache();
      if (cached.length > 0) {
        return cached;
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
