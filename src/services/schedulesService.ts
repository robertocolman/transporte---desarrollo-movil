import {
  Feriado,
  Horario,
  Linea,
  RespuestaLista,
  Sentido,
  TipoDeDia,
} from '@/types';
import { linesService } from '@/services/linesService';
import {
  ApiHttpError,
  fetchApiJson,
  getLocalDb,
  getSyncTimestamp,
  setSyncTimestamp,
} from '@/services/localDb';

export interface ProximoArribo {
  horarioId: string;
  lineaId: string;
  lineaNumero: string;
  lineaNombre: string;
  lineaColor: string;
  destino: string;
  sentido: Sentido;
  horaProgramada: string;
  minutosRestantes: number;
  esManiana: boolean;
}

export interface GrupoArribosLinea {
  lineaId: string;
  lineaNumero: string;
  lineaNombre: string;
  lineaColor: string;
  destino: string;
  arribosHoy: ProximoArribo[];
  arribosManiana: ProximoArribo[];
  sinServicioHastaManiana: boolean;
  primerServicioManiana: string | null;
}

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeHM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Regla R6 oficial: prioridad feriado > domingo > sabado > habil
 */
export function calcularTipoDeDiaConFeriados(
  fecha: Date,
  feriadosSet: ReadonlySet<string>
): TipoDeDia {
  const ymd = formatDateYMD(fecha);
  if (feriadosSet.has(ymd)) {
    return 'feriado';
  }
  const diaSemana = fecha.getDay();
  if (diaSemana === 0) return 'domingo';
  if (diaSemana === 6) return 'sabado';
  return 'habil';
}

async function readFeriadosFromCache(): Promise<Feriado[]> {
  const db = await getLocalDb();
  return db.getAllAsync<Feriado>(
    'SELECT fecha, nombre FROM feriados_cache ORDER BY fecha ASC;'
  );
}

async function syncFeriadosAnio(anio: number): Promise<Feriado[]> {
  const { payload, serverTimeIso } = await fetchApiJson<RespuestaLista<Feriado>>(
    `/feriados?anio=${anio}&porPagina=100`
  );
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    for (const f of payload.datos) {
      await db.runAsync(
        'INSERT OR REPLACE INTO feriados_cache (fecha, nombre) VALUES (?, ?);',
        [f.fecha, f.nombre]
      );
    }
  });
  await setSyncTimestamp('feriados', serverTimeIso);
  return payload.datos;
}

let feriadosSyncPromise: Promise<Feriado[]> | null = null;
let lastFeriadosSyncMs = 0;

async function ensureFeriadosDisponibles(): Promise<Feriado[]> {
  const now = Date.now();
  if (now - lastFeriadosSyncMs < 10 * 60_000) {
    const cached = await readFeriadosFromCache();
    if (cached.length > 0) return cached;
  }

  if (feriadosSyncPromise) {
    return feriadosSyncPromise;
  }

  feriadosSyncPromise = (async () => {
    try {
      const anioActual = new Date().getFullYear();
      await syncFeriadosAnio(anioActual);
      if (new Date().getMonth() === 11) {
        await syncFeriadosAnio(anioActual + 1).catch(() => {});
      }
      lastFeriadosSyncMs = Date.now();
      return await readFeriadosFromCache();
    } catch {
      return await readFeriadosFromCache();
    } finally {
      feriadosSyncPromise = null;
    }
  })();

  return feriadosSyncPromise;
}

async function saveHorariosParadaToCache(
  paradaId: string,
  horarios: Horario[],
  serverTimeIso: string
): Promise<void> {
  const db = await getLocalDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM horarios WHERE paradaId = ?;', [paradaId]);
    for (const h of horarios) {
      await db.runAsync(
        `INSERT OR REPLACE INTO horarios (id, lineaId, paradaId, sentido, tipoDeDia, hora)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [h.id, h.lineaId, h.paradaId, h.sentido, h.tipoDeDia, h.hora]
      );
    }
  });
  await setSyncTimestamp('horarios', serverTimeIso);
}

async function readHorariosParadaFromCache(
  paradaId: string,
  tipoDeDia?: TipoDeDia,
  lineaId?: string
): Promise<Horario[]> {
  const db = await getLocalDb();
  let query = 'SELECT * FROM horarios WHERE paradaId = ?';
  const params: string[] = [paradaId];

  if (tipoDeDia) {
    query += ' AND tipoDeDia = ?';
    params.push(tipoDeDia);
  }
  if (lineaId) {
    query += ' AND lineaId = ?';
    params.push(lineaId);
  }

  query += ' ORDER BY hora ASC, lineaId ASC, id ASC;';
  return db.getAllAsync<Horario>(query, params);
}

/**
 * Réplica exacta en el teléfono de la Regla R8 del backend (`proximosPasos`):
 * Para cada línea de la parada, obtiene hasta `cantidad` pasos restantes de hoy
 * (según el tipo de día de hoy) y completa los faltantes con los de mañana
 * (según el tipo de día de mañana). Permite funcionar 100% sin señal sobre SQLite.
 */
function calcularProximosLocalmente(
  ahora: Date,
  horariosParada: Horario[],
  feriadosSet: ReadonlySet<string>,
  cantidad: number
): Horario[] {
  const horaActual = formatTimeHM(ahora);
  const tipoHoy = calcularTipoDeDiaConFeriados(ahora, feriadosSet);
  const tipoManiana = calcularTipoDeDiaConFeriados(addDays(ahora, 1), feriadosSet);

  const porLinea = new Map<string, Horario[]>();
  for (const h of horariosParada) {
    const lista = porLinea.get(h.lineaId) ?? [];
    lista.push(h);
    porLinea.set(h.lineaId, lista);
  }

  const comparar = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const porHoraEId = (a: Horario, b: Horario) =>
    comparar(a.hora, b.hora) || comparar(a.id, b.id);

  const elegidos: { dia: 0 | 1; horario: Horario }[] = [];

  for (const listaLinea of porLinea.values()) {
    const deHoy = listaLinea
      .filter((x) => x.tipoDeDia === tipoHoy && x.hora >= horaActual)
      .sort(porHoraEId)
      .slice(0, cantidad);

    const faltan = cantidad - deHoy.length;
    const deManiana =
      faltan > 0
        ? listaLinea
            .filter((x) => x.tipoDeDia === tipoManiana)
            .sort(porHoraEId)
            .slice(0, faltan)
        : [];

    for (const h of deHoy) elegidos.push({ dia: 0, horario: h });
    for (const h of deManiana) elegidos.push({ dia: 1, horario: h });
  }

  return elegidos
    .sort(
      (a, b) =>
        a.dia - b.dia ||
        comparar(a.horario.hora, b.horario.hora) ||
        comparar(a.horario.lineaId, b.horario.lineaId) ||
        comparar(a.horario.id, b.horario.id)
    )
    .map((x) => x.horario);
}

function mapearHorariosAProximos(
  horariosProximos: Horario[],
  lineas: Linea[],
  ahora: Date
): ProximoArribo[] {
  const horaActualStr = formatTimeHM(ahora);
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();

  return horariosProximos.map((h) => {
    const [hhStr, mmStr] = h.hora.split(':');
    const pasoMin = parseInt(hhStr, 10) * 60 + parseInt(mmStr, 10);

    // Regla D3 de la API: los horarios con hora menor a la actual corresponden a mañana
    const esManiana = h.hora < horaActualStr;
    const minutosRestantes = esManiana
      ? 24 * 60 - ahoraMin + pasoMin
      : Math.max(0, pasoMin - ahoraMin);

    const linea = lineas.find((l) => l.id === h.lineaId);
    const recorrido = linea?.recorridos.find((r) => r.sentido === h.sentido);
    const numeroFallback = h.lineaId.replace(/^lin-0?/, '');

    return {
      horarioId: h.id,
      lineaId: h.lineaId,
      lineaNumero: linea?.numero || numeroFallback || '?',
      lineaNombre: linea?.nombre || `Línea ${numeroFallback}`,
      lineaColor: linea?.color || '#2563EB',
      destino:
        recorrido?.destino ||
        (h.sentido === 'ida' ? 'Sentido Ida' : 'Sentido Vuelta'),
      sentido: h.sentido,
      horaProgramada: h.hora,
      minutosRestantes,
      esManiana,
    };
  });
}

export const schedulesService = {
  /**
   * Determina sincrónicamente el tipo de día (con set opcional de feriados YYYY-MM-DD).
   */
  getTipoDeDiaActual(
    fecha: Date = new Date(),
    feriadosSet: ReadonlySet<string> = new Set()
  ): TipoDeDia {
    return calcularTipoDeDiaConFeriados(fecha, feriadosSet);
  },

  /**
   * Determina el tipo de día consultando primero la tabla de feriados nacionales (`GET /feriados` + SQLite).
   * Cumple la jerarquía obligatoria R6: feriado > domingo > sabado > habil.
   */
  async resolverTipoDeDia(
    fecha: Date = new Date()
  ): Promise<{ tipoDeDia: TipoDeDia; feriadoNombre: string | null }> {
    const feriados = await ensureFeriadosDisponibles();
    const ymd = formatDateYMD(fecha);
    const feriadoHoy = feriados.find((f) => f.fecha === ymd);
    if (feriadoHoy) {
      return { tipoDeDia: 'feriado', feriadoNombre: feriadoHoy.nombre };
    }
    return {
      tipoDeDia: calcularTipoDeDiaConFeriados(fecha, new Set()),
      feriadoNombre: null,
    };
  },

  /**
   * Devuelve el timestamp ISO de la última sincronización de horarios con el servidor.
   */
  async getUltimaSincronizacionHorarios(): Promise<string | null> {
    return getSyncTimestamp('horarios');
  },

  /**
   * Sincroniza la tabla completa de horarios de una parada desde `GET /horarios?paradaId=...&porPagina=5000`
   * hacia SQLite para dejarla disponible offline, y devuelve las filas filtradas.
   */
  async getHorariosPorParada(
    paradaId: string,
    tipoDeDia?: TipoDeDia,
    lineaId?: string
  ): Promise<Horario[]> {
    try {
      const { payload, serverTimeIso } = await fetchApiJson<
        RespuestaLista<Horario>
      >(`/horarios?paradaId=${encodeURIComponent(paradaId)}&porPagina=5000`);

      await saveHorariosParadaToCache(paradaId, payload.datos, serverTimeIso);

      return payload.datos
        .filter(
          (h) =>
            (!tipoDeDia || h.tipoDeDia === tipoDeDia) &&
            (!lineaId || h.lineaId === lineaId)
        )
        .sort((a, b) => a.hora.localeCompare(b.hora));
    } catch (err) {
      const cached = await readHorariosParadaFromCache(
        paradaId,
        tipoDeDia,
        lineaId
      );
      if (cached.length > 0) {
        return cached;
      }

      // Verificar si la parada sí fue sincronizada pero ese filtro puntual está vacío
      const totalParadaEnCache = await readHorariosParadaFromCache(paradaId);
      if (totalParadaEnCache.length > 0) {
        return [];
      }

      if (err instanceof ApiHttpError) {
        throw err;
      }
      throw new Error(
        'Sin conexión a internet y los horarios de esta parada todavía no están descargados en el teléfono.'
      );
    }
  },

  /**
   * Obtiene los próximos pasos por línea según la tabla oficial (`GET /paradas/:id/proximos?cantidad=3`),
   * con cálculo local idéntico sobre SQLite + feriados cuando el celular no tiene datos.
   */
  async calcularProximosArribos(
    paradaId: string,
    cantidadPorLinea = 3
  ): Promise<ProximoArribo[]> {
    const ahora = new Date();
    const todasLasLineas = await linesService
      .getAllLines()
      .catch(() => [] as Linea[]);

    try {
      const { payload, serverTimeIso } = await fetchApiJson<
        RespuestaLista<Horario>
      >(
        `/paradas/${encodeURIComponent(paradaId)}/proximos?cantidad=${cantidadPorLinea}`
      );
      await setSyncTimestamp('horarios', serverTimeIso);

      // Precarga en segundo plano la tabla completa de la parada y los feriados para uso offline
      void ensureFeriadosDisponibles();
      void fetchApiJson<RespuestaLista<Horario>>(
        `/horarios?paradaId=${encodeURIComponent(paradaId)}&porPagina=5000`
      )
        .then(({ payload: tablaCompleta, serverTimeIso: ts }) =>
          saveHorariosParadaToCache(paradaId, tablaCompleta.datos, ts)
        )
        .catch(() => {});

      return mapearHorariosAProximos(payload.datos, todasLasLineas, ahora);
    } catch (err) {
      // Modo offline: calculamos con SQLite + tabla local de feriados (Reglas R6 y R8)
      const horariosEnCache = await readHorariosParadaFromCache(paradaId);
      if (horariosEnCache.length === 0) {
        if (err instanceof ApiHttpError) {
          throw err;
        }
        throw new Error(
          'Sin señal y sin horarios guardados localmente para esta parada.'
        );
      }

      const feriados = await readFeriadosFromCache();
      const feriadosSet = new Set(feriados.map((f) => f.fecha));
      const calculados = calcularProximosLocalmente(
        ahora,
        horariosEnCache,
        feriadosSet,
        cantidadPorLinea
      );

      return mapearHorariosAProximos(calculados, todasLasLineas, ahora);
    }
  },

  /**
   * Agrupa los próximos arribos por línea para mostrar los 3 próximos de cada línea
   * y detectar explícitamente cuándo terminó el servicio de hoy ("No hay más servicio hasta mañana a las HH:MM").
   */
  agruparArribosPorLinea(arribos: ProximoArribo[]): GrupoArribosLinea[] {
    const mapa = new Map<string, GrupoArribosLinea>();

    for (const item of arribos) {
      let grupo = mapa.get(item.lineaId);
      if (!grupo) {
        grupo = {
          lineaId: item.lineaId,
          lineaNumero: item.lineaNumero,
          lineaNombre: item.lineaNombre,
          lineaColor: item.lineaColor,
          destino: item.destino,
          arribosHoy: [],
          arribosManiana: [],
          sinServicioHastaManiana: false,
          primerServicioManiana: null,
        };
        mapa.set(item.lineaId, grupo);
      }

      if (item.esManiana) {
        grupo.arribosManiana.push(item);
      } else {
        grupo.arribosHoy.push(item);
      }
    }

    const grupos = Array.from(mapa.values());
    for (const g of grupos) {
      g.arribosHoy.sort((a, b) => a.horaProgramada.localeCompare(b.horaProgramada));
      g.arribosManiana.sort((a, b) =>
        a.horaProgramada.localeCompare(b.horaProgramada)
      );
      g.sinServicioHastaManiana =
        g.arribosHoy.length === 0 && g.arribosManiana.length > 0;
      g.primerServicioManiana = g.arribosManiana[0]?.horaProgramada ?? null;
    }

    return grupos.sort((a, b) => {
      const numA = parseInt(a.lineaNumero, 10);
      const numB = parseInt(b.lineaNumero, 10);
      if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.lineaNumero.localeCompare(b.lineaNumero);
    });
  },
};
