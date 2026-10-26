import { Horario, Sentido, TipoDeDia } from '@/types';

// Generador auxiliar de frecuencias horarias para Paradas de Paraná
function generarFrecuencias(
  lineaId: string,
  paradaId: string,
  sentido: Sentido,
  tipoDeDia: TipoDeDia,
  horaInicio: number,
  horaFin: number,
  intervaloMinutos: number,
  offsetMinutos: number = 0
): Horario[] {
  const lista: Horario[] = [];
  let contador = 1;

  for (let h = horaInicio; h <= horaFin; h++) {
    for (let m = offsetMinutos; m < 60; m += intervaloMinutos) {
      if (h === horaFin && m > 30) break;
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      lista.push({
        id: `hor-${lineaId}-${paradaId}-${tipoDeDia}-${contador++}`,
        lineaId,
        paradaId,
        sentido,
        tipoDeDia,
        hora: `${hh}:${mm}`,
      });
    }
  }

  return lista;
}

export const mockHorarios: Horario[] = [
  // LÍNEA 5 en Parada 101 (Alameda y Urquiza) - Hábiles (cada 12 min)
  ...generarFrecuencias('lin-05', 'par-101', 'ida', 'habil', 5, 23, 12, 3),
  // LÍNEA 5 en Parada 101 - Sábados (cada 18 min)
  ...generarFrecuencias('lin-05', 'par-101', 'ida', 'sabado', 6, 23, 18, 5),
  // LÍNEA 5 en Parada 101 - Domingos / Feriados (cada 25 min)
  ...generarFrecuencias('lin-05', 'par-101', 'ida', 'domingo', 7, 22, 25, 10),
  ...generarFrecuencias('lin-05', 'par-101', 'ida', 'feriado', 7, 22, 25, 10),

  // LÍNEA 14 en Parada 101 (Alameda y Urquiza) - Hábiles (cada 15 min)
  ...generarFrecuencias('lin-14', 'par-101', 'ida', 'habil', 5, 23, 15, 8),
  ...generarFrecuencias('lin-14', 'par-101', 'ida', 'sabado', 6, 23, 20, 10),
  ...generarFrecuencias('lin-14', 'par-101', 'ida', 'domingo', 7, 22, 30, 15),
  ...generarFrecuencias('lin-14', 'par-101', 'ida', 'feriado', 7, 22, 30, 15),

  // LÍNEA 1 en Parada 102 (Peatonal San Martín) - Hábiles
  ...generarFrecuencias('lin-01', 'par-102', 'ida', 'habil', 5, 23, 14, 4),
  ...generarFrecuencias('lin-01', 'par-102', 'ida', 'sabado', 6, 23, 20, 7),
  ...generarFrecuencias('lin-01', 'par-102', 'ida', 'domingo', 7, 22, 28, 12),
  ...generarFrecuencias('lin-01', 'par-102', 'ida', 'feriado', 7, 22, 28, 12),

  // LÍNEA 5 en Parada 102 (Peatonal San Martín)
  ...generarFrecuencias('lin-05', 'par-102', 'ida', 'habil', 5, 23, 12, 7),
  ...generarFrecuencias('lin-05', 'par-102', 'ida', 'sabado', 6, 23, 18, 11),
  ...generarFrecuencias('lin-05', 'par-102', 'ida', 'domingo', 7, 22, 25, 16),
  ...generarFrecuencias('lin-05', 'par-102', 'ida', 'feriado', 7, 22, 25, 16),

  // LÍNEA 15 en Parada 102 (Peatonal San Martín)
  ...generarFrecuencias('lin-15', 'par-102', 'ida', 'habil', 5, 23, 20, 12),
  ...generarFrecuencias('lin-15', 'par-102', 'ida', 'sabado', 6, 23, 25, 15),
  ...generarFrecuencias('lin-15', 'par-102', 'ida', 'domingo', 7, 22, 35, 20),
  ...generarFrecuencias('lin-15', 'par-102', 'ida', 'feriado', 7, 22, 35, 20),

  // LÍNEA 2 en Parada 103 (Casa de Gobierno)
  ...generarFrecuencias('lin-02', 'par-103', 'ida', 'habil', 5, 23, 15, 6),
  ...generarFrecuencias('lin-02', 'par-103', 'ida', 'sabado', 6, 23, 22, 10),
  ...generarFrecuencias('lin-02', 'par-103', 'ida', 'domingo', 7, 22, 30, 15),
  ...generarFrecuencias('lin-02', 'par-103', 'ida', 'feriado', 7, 22, 30, 15),

  // LÍNEA 1 en Parada 107 (Hospital San Martín)
  ...generarFrecuencias('lin-01', 'par-107', 'ida', 'habil', 5, 23, 14, 11),
  // LÍNEA 2 en Parada 107 (Hospital San Martín)
  ...generarFrecuencias('lin-02', 'par-107', 'ida', 'habil', 5, 23, 15, 12),
  // LÍNEA 5 en Parada 107 (Hospital San Martín)
  ...generarFrecuencias('lin-05', 'par-107', 'ida', 'habil', 5, 23, 12, 14),

  // LÍNEA 2 en Parada 106 (Terminal)
  ...generarFrecuencias('lin-02', 'par-106', 'vuelta', 'habil', 5, 23, 15, 2),
  // LÍNEA 15 en Parada 106 (Terminal)
  ...generarFrecuencias('lin-15', 'par-106', 'ida', 'habil', 5, 23, 20, 5),
];
