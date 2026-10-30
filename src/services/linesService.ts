import { Linea, Recorrido, RespuestaLista, RespuestaUno, Sentido } from '@/types';
import {
  ApiHttpError,
  fetchApiJson,
  getLocalDb,
  setSyncTimestamp,
} from '@/services/localDb';

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const MEMORY_TTL_MS = 60_000;
let memoryLines: Linea[] | null = null;
let memoryLinesFetchedAt = 0;
let inFlightLines: Promise<Linea[]> | null = null;

async function saveLinesToCache(
  lineas: Linea[],
  serverTimeIso: string
): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM lineas_cache;');
    for (let i = 0; i < lineas.length; i += 1) {
      const linea = lineas[i];
      await db.runAsync(
        'INSERT OR REPLACE INTO lineas_cache (id, orden, payload) VALUES (?, ?, ?);',
        [linea.id, i, JSON.stringify(linea)]
      );
    }
  });
  await setSyncTimestamp('lineas', serverTimeIso);
}

async function upsertSingleLineInCache(linea: Linea): Promise<void> {
  const db = await getLocalDb();
  const existing = await db.getFirstAsync<{ orden: number }>(
    'SELECT orden FROM lineas_cache WHERE id = ?;',
    [linea.id]
  );
  const orden = existing?.orden ?? 999;
  await db.runAsync(
    'INSERT OR REPLACE INTO lineas_cache (id, orden, payload) VALUES (?, ?, ?);',
    [linea.id, orden, JSON.stringify(linea)]
  );
}

async function readLinesFromCache(): Promise<Linea[]> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM lineas_cache ORDER BY orden ASC;'
  );
  const result: Linea[] = [];
  for (const row of rows) {
    try {
      result.push(JSON.parse(row.payload) as Linea);
    } catch {
      // Ignorar fila inválida
    }
  }
  return result;
}

export const linesService = {
  /**
   * Obtiene todas las líneas urbanas de Paraná con sus recorridos desde `GET /lineas`
   * y las guarda en SQLite para que los mapas y trazados funcionen sin conexión.
   */
  async getAllLines(forceRefresh = false): Promise<Linea[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      memoryLines &&
      now - memoryLinesFetchedAt < MEMORY_TTL_MS
    ) {
      return memoryLines;
    }

    if (inFlightLines) {
      return inFlightLines;
    }

    inFlightLines = (async () => {
      try {
        const { payload, serverTimeIso } = await fetchApiJson<
          RespuestaLista<Linea>
        >('/lineas?porPagina=100');

        const lineas = payload.datos;
        memoryLines = lineas;
        memoryLinesFetchedAt = Date.now();

        await saveLinesToCache(lineas, serverTimeIso);
        return lineas;
      } catch (err) {
        const cached = await readLinesFromCache();
        if (cached.length > 0) {
          memoryLines = cached;
          memoryLinesFetchedAt = Date.now();
          return cached;
        }

        if (err instanceof ApiHttpError) {
          throw err;
        }
        throw new Error(
          'No se pudo conectar con el servidor y no hay recorridos guardados sin conexión.'
        );
      } finally {
        inFlightLines = null;
      }
    })();

    return inFlightLines;
  },

  /**
   * Obtiene una línea específica por su ID (`GET /lineas/:id`) con respaldo offline en SQLite.
   */
  async getLineById(id: string): Promise<Linea | undefined> {
    if (
      memoryLines &&
      Date.now() - memoryLinesFetchedAt < MEMORY_TTL_MS
    ) {
      const fromMemory = memoryLines.find((l) => l.id === id);
      if (fromMemory) return fromMemory;
    }

    try {
      const { payload } = await fetchApiJson<RespuestaUno<Linea>>(
        `/lineas/${encodeURIComponent(id)}`
      );
      await upsertSingleLineInCache(payload.datos);
      return payload.datos;
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 404) {
        return undefined;
      }

      const cached = await readLinesFromCache();
      if (cached.length > 0) {
        return cached.find((l) => l.id === id);
      }

      if (err instanceof ApiHttpError) {
        throw err;
      }
      throw new Error(
        'Sin conexión para consultar la línea y no hay copia local en el teléfono.'
      );
    }
  },

  /**
   * Obtiene el recorrido específico de una línea según el sentido (ida o vuelta).
   */
  async getRecorrido(
    lineaId: string,
    sentido: Sentido
  ): Promise<Recorrido | undefined> {
    const linea = await this.getLineById(lineaId);
    if (!linea) return undefined;
    return linea.recorridos.find((r) => r.sentido === sentido);
  },

  /**
   * Busca líneas por número, nombre, empresa o destino de recorrido (sin distinguir tildes).
   */
  async searchLines(query: string, forceRefresh = false): Promise<Linea[]> {
    const todas = await this.getAllLines(forceRefresh);
    const q = normalizeSearchText(query);
    if (!q) return todas;

    const qSinPrefijo = q.replace(/^l(inea)?\s*/i, '');

    return todas.filter((l) => {
      const numeroNorm = normalizeSearchText(l.numero);
      const nombreNorm = normalizeSearchText(l.nombre);
      const empresaNorm = normalizeSearchText(l.empresa);
      const destinosNorm = l.recorridos
        .map((r) => normalizeSearchText(r.destino))
        .join(' ');

      return (
        numeroNorm.includes(q) ||
        (qSinPrefijo !== '' && numeroNorm === qSinPrefijo) ||
        nombreNorm.includes(q) ||
        empresaNorm.includes(q) ||
        destinosNorm.includes(q)
      );
    });
  },
};
