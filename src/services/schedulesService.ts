import * as SQLite from 'expo-sqlite';
import { Horario, Sentido, TipoDeDia } from '@/types';
import { mockHorarios } from '@/mocks/schedules';
import { linesService } from '@/services/linesService';

export interface ProximoArribo {
  horarioId: string;
  lineaId: string;
  lineaNumero: string;
  lineaColor: string;
  destino: string;
  sentido: Sentido;
  horaProgramada: string;
  minutosRestantes: number;
}

const dbPromise = SQLite.openDatabaseAsync('horarios.db');

async function getDB() {
  const db = await dbPromise;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS horarios (
      id TEXT PRIMARY KEY NOT NULL,
      lineaId TEXT NOT NULL,
      paradaId TEXT NOT NULL,
      sentido TEXT NOT NULL,
      tipoDeDia TEXT NOT NULL,
      hora TEXT NOT NULL
    );
  `);

  // Verificar si la tabla ya tiene datos guardados
  const countResult = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM horarios;'
  );

  if (!countResult || countResult.total === 0) {
    // Carga inicial (seed) offline desde mocks
    for (const h of mockHorarios) {
      await db.runAsync(
        'INSERT INTO horarios (id, lineaId, paradaId, sentido, tipoDeDia, hora) VALUES (?, ?, ?, ?, ?, ?);',
        [h.id, h.lineaId, h.paradaId, h.sentido, h.tipoDeDia, h.hora]
      );
    }
  }

  return db;
}

export const schedulesService = {
  /**
   * Determina el tipo de día según la fecha
   */
  getTipoDeDiaActual(fecha: Date = new Date()): TipoDeDia {
    const diaSemana = fecha.getDay(); // 0 = Domingo, 6 = Sábado
    if (diaSemana === 0) return 'domingo';
    if (diaSemana === 6) return 'sabado';
    return 'habil';
  },

  /**
   * Obtiene todos los horarios programados para una parada, con filtros opcionales
   */
  async getHorariosPorParada(
    paradaId: string,
    tipoDeDia?: TipoDeDia,
    lineaId?: string
  ): Promise<Horario[]> {
    try {
      const db = await getDB();
      let query = 'SELECT * FROM horarios WHERE paradaId = ?';
      const params: any[] = [paradaId];

      if (tipoDeDia) {
        query += ' AND tipoDeDia = ?';
        params.push(tipoDeDia);
      }

      if (lineaId) {
        query += ' AND lineaId = ?';
        params.push(lineaId);
      }

      query += ' ORDER BY hora ASC;';

      const rows = await db.getAllAsync<Horario>(query, params);
      return rows;
    } catch {
      // Fallback a mocks en memoria si SQLite tuviera alguna limitación
      return mockHorarios
        .filter(
          (h) =>
            h.paradaId === paradaId &&
            (!tipoDeDia || h.tipoDeDia === tipoDeDia) &&
            (!lineaId || h.lineaId === lineaId)
        )
        .sort((a, b) => a.hora.localeCompare(b.hora));
    }
  },

  /**
   * Calcula en tiempo real los próximos colectivos que están por llegar a la parada
   */
  async calcularProximosArribos(paradaId: string): Promise<ProximoArribo[]> {
    const ahora = new Date();
    const tipoDiaActual = this.getTipoDeDiaActual(ahora);

    const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();

    const horariosHoy = await this.getHorariosPorParada(paradaId, tipoDiaActual);
    const todasLasLineas = await linesService.getAllLines();

    const proximos: ProximoArribo[] = [];

    for (const h of horariosHoy) {
      const [hhStr, mmStr] = h.hora.split(':');
      const pasoMinutos = parseInt(hhStr, 10) * 60 + parseInt(mmStr, 10);
      const diffMinutos = pasoMinutos - horaActualMinutos;

      // Colectivos que pasan dentro de los próximos 90 minutos
      if (diffMinutos >= 0 && diffMinutos <= 90) {
        const linea = todasLasLineas.find((l) => l.id === h.lineaId);
        const recorrido = linea?.recorridos.find((r) => r.sentido === h.sentido);

        proximos.push({
          horarioId: h.id,
          lineaId: h.lineaId,
          lineaNumero: linea?.numero || '?',
          lineaColor: linea?.color || '#3B82F6',
          destino: recorrido?.destino || (h.sentido === 'ida' ? 'Ida' : 'Vuelta'),
          sentido: h.sentido,
          horaProgramada: h.hora,
          minutosRestantes: diffMinutos,
        });
      }
    }

    // Ordenar por menor tiempo restante
    proximos.sort((a, b) => a.minutosRestantes - b.minutosRestantes);

    return proximos.slice(0, 6);
  },
};
