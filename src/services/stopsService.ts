import {
  ApiSuccessResponse,
  Linea,
  Parada,
  RespuestaLista,
  RespuestaUno,
} from '@/types';
import {
  ApiHttpError,
  fetchApiJson,
  getLocalDb,
  setSyncTimestamp,
} from '@/services/localDb';

/**
 * Fórmula de Haversine para calcular distancia esférica en metros entre 2 coordenadas
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio terrestre en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Calcula el azimut / bearing geográfico (rumbo en grados de 0 a 360)
 * desde el origen (usuario) hacia el destino (parada).
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  const brng = (θ * 180) / Math.PI;
  return (brng + 360) % 360; // Normalizado 0..360
}

export interface ParadaConDistancia extends Parada {
  distanciaMetros?: number;
  bearingGrados?: number;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const MEMORY_TTL_MS = 60_000;
let memoryStops: Parada[] | null = null;
let memoryStopsFetchedAt = 0;
let inFlightAllStops: Promise<Parada[]> | null = null;

async function saveStopsToCache(
  paradas: Parada[],
  serverTimeIso: string
): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM paradas_cache;');
    for (let i = 0; i < paradas.length; i += 1) {
      const parada = paradas[i];
      await db.runAsync(
        'INSERT OR REPLACE INTO paradas_cache (id, orden, payload) VALUES (?, ?, ?);',
        [parada.id, i, JSON.stringify(parada)]
      );
    }
  });
  await setSyncTimestamp('paradas', serverTimeIso);
}

async function upsertSingleStopInCache(parada: Parada): Promise<void> {
  const db = await getLocalDb();
  const existing = await db.getFirstAsync<{ orden: number }>(
    'SELECT orden FROM paradas_cache WHERE id = ?;',
    [parada.id]
  );
  const orden = existing?.orden ?? 9999;
  await db.runAsync(
    'INSERT OR REPLACE INTO paradas_cache (id, orden, payload) VALUES (?, ?, ?);',
    [parada.id, orden, JSON.stringify(parada)]
  );
}

async function readStopsFromCache(): Promise<Parada[]> {
  const db = await getLocalDb();
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM paradas_cache ORDER BY orden ASC;'
  );
  const result: Parada[] = [];
  for (const row of rows) {
    try {
      result.push(JSON.parse(row.payload) as Parada);
    } catch {
      // Ignorar fila corrupta
    }
  }
  return result;
}

async function readLinesFromCacheOrApi(): Promise<Linea[]> {
  try {
    const { payload, serverTimeIso } = await fetchApiJson<RespuestaLista<Linea>>(
      '/lineas?porPagina=100'
    );
    const db = await getLocalDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM lineas_cache;');
      for (let i = 0; i < payload.datos.length; i += 1) {
        const l = payload.datos[i];
        await db.runAsync(
          'INSERT OR REPLACE INTO lineas_cache (id, orden, payload) VALUES (?, ?, ?);',
          [l.id, i, JSON.stringify(l)]
        );
      }
    });
    await setSyncTimestamp('lineas', serverTimeIso);
    return payload.datos;
  } catch {
    const db = await getLocalDb();
    const rows = await db.getAllAsync<{ payload: string }>(
      'SELECT payload FROM lineas_cache ORDER BY orden ASC;'
    );
    return rows
      .map((r) => {
        try {
          return JSON.parse(r.payload) as Linea;
        } catch {
          return null;
        }
      })
      .filter((l): l is Linea => Boolean(l));
  }
}

export const stopsService = {
  /**
   * Obtiene el catálogo completo de paradas desde la API oficial (`GET /paradas?porPagina=1000`)
   * y lo persiste en SQLite para consulta sin conexión.
   */
  async getAllStops(forceRefresh = false): Promise<Parada[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      memoryStops &&
      now - memoryStopsFetchedAt < MEMORY_TTL_MS
    ) {
      return memoryStops;
    }

    if (inFlightAllStops) {
      return inFlightAllStops;
    }

    inFlightAllStops = (async () => {
      try {
        const { payload, serverTimeIso } = await fetchApiJson<
          RespuestaLista<Parada>
        >('/paradas?porPagina=1000');

        const paradas = payload.datos;
        memoryStops = paradas;
        memoryStopsFetchedAt = Date.now();

        await saveStopsToCache(paradas, serverTimeIso);
        return paradas;
      } catch (err) {
        const cached = await readStopsFromCache();
        if (cached.length > 0) {
          memoryStops = cached;
          memoryStopsFetchedAt = Date.now();
          return cached;
        }

        if (err instanceof ApiHttpError) {
          throw err;
        }
        throw new Error(
          'No se pudo conectar con el servidor de Transporte Paraná y no hay paradas guardadas en el teléfono.'
        );
      } finally {
        inFlightAllStops = null;
      }
    })();

    return inFlightAllStops;
  },

  /**
   * Obtiene paradas filtradas opcionalmente por calle o nombre (`GET /paradas?q=...`),
   * con respaldo offline sobre SQLite sin distinguir tildes.
   */
  async getStops(query?: string): Promise<ApiSuccessResponse<Parada[]>> {
    const trimmed = query?.trim() ?? '';

    if (!trimmed) {
      const todas = await this.getAllStops();
      return {
        datos: todas,
        meta: {
          total: todas.length,
          pagina: 1,
          porPagina: todas.length || 1,
        },
      };
    }

    try {
      const { payload } = await fetchApiJson<RespuestaLista<Parada>>(
        `/paradas?porPagina=1000&q=${encodeURIComponent(trimmed)}`
      );
      return payload;
    } catch (err) {
      const cached = memoryStops ?? (await readStopsFromCache());
      if (cached.length > 0) {
        const qNorm = normalizeSearchText(trimmed);
        const filtradas = cached.filter((p) =>
          normalizeSearchText(p.nombre).includes(qNorm)
        );
        return {
          datos: filtradas,
          meta: {
            total: filtradas.length,
            pagina: 1,
            porPagina: filtradas.length || 1,
          },
        };
      }

      if (err instanceof ApiHttpError) {
        throw err;
      }
      throw new Error(
        'Sin conexión para buscar paradas y no hay datos locales sincronizados.'
      );
    }
  },

  /**
   * Obtiene paradas ordenadas por cercanía real (Haversine) y rumbo (bearing) a una coordenada.
   * Funciona tanto con red como sin señal usando el catálogo local en SQLite.
   */
  async getNearbyStops(
    lat: number,
    lon: number,
    query?: string
  ): Promise<ApiSuccessResponse<ParadaConDistancia[]>> {
    const baseResponse = await this.getStops(query);

    const conDistancia: ParadaConDistancia[] = baseResponse.datos.map((p) => {
      const distancia = calculateDistanceMeters(
        lat,
        lon,
        p.coordenadas.latitud,
        p.coordenadas.longitud
      );
      const rumbo = calculateBearing(
        lat,
        lon,
        p.coordenadas.latitud,
        p.coordenadas.longitud
      );
      return {
        ...p,
        distanciaMetros: distancia,
        bearingGrados: rumbo,
      };
    });

    conDistancia.sort(
      (a, b) => (a.distanciaMetros ?? 0) - (b.distanciaMetros ?? 0)
    );

    return {
      datos: conDistancia,
      meta: {
        total: conDistancia.length,
        pagina: 1,
        porPagina: conDistancia.length || 1,
      },
    };
  },

  /**
   * Obtiene el detalle de una parada por su ID (`GET /paradas/:id`) con soporte offline.
   */
  async getStopById(id: string): Promise<Parada | null> {
    if (
      memoryStops &&
      Date.now() - memoryStopsFetchedAt < MEMORY_TTL_MS
    ) {
      const fromMemory = memoryStops.find((p) => p.id === id);
      if (fromMemory) return fromMemory;
    }

    try {
      const { payload } = await fetchApiJson<RespuestaUno<Parada>>(
        `/paradas/${encodeURIComponent(id)}`
      );
      await upsertSingleStopInCache(payload.datos);
      return payload.datos;
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 404) {
        return null;
      }

      const cached = await readStopsFromCache();
      if (cached.length > 0) {
        return cached.find((p) => p.id === id) ?? null;
      }

      if (err instanceof ApiHttpError) {
        throw err;
      }
      throw new Error(
        'No se pudo cargar la parada sin conexión. Conectate al menos una vez para sincronizar la red.'
      );
    }
  },

  /**
   * Resuelve una parada a partir del código QR escaneado (`GET /paradas/qr/:codigo`, ej: "PARANA:par-101").
   * Si la API responde 404 `QR_NO_RECONOCIDO`, devuelve `null` sin romper la app.
   * Si el dispositivo está offline, intenta resolverlo contra la base SQLite local.
   */
  async getStopByQr(codigoQr: string): Promise<Parada | null> {
    const cleanCode = codigoQr.trim();
    if (!cleanCode) return null;

    try {
      const { payload } = await fetchApiJson<RespuestaUno<Parada>>(
        `/paradas/qr/${encodeURIComponent(cleanCode)}`
      );
      await upsertSingleStopInCache(payload.datos);
      return payload.datos;
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 404) {
        return null;
      }

      const cached = memoryStops ?? (await readStopsFromCache());
      if (cached.length > 0) {
        return cached.find((p) => p.codigoQr === cleanCode) ?? null;
      }

      if (err instanceof ApiHttpError) {
        throw err;
      }
      throw new Error(
        'Sin conexión para validar el código QR y no hay paradas guardadas en el teléfono.'
      );
    }
  },

  /**
   * Obtiene las líneas que operan en una parada desde la API o la caché SQLite local.
   */
  async getLinesForStop(lineaIds: string[]): Promise<Linea[]> {
    if (!lineaIds || lineaIds.length === 0) return [];
    const lineas = await readLinesFromCacheOrApi();
    return lineas.filter((l) => lineaIds.includes(l.id));
  },
};
