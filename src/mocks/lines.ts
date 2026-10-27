import { Linea } from '@/types';

export const mockLineas: Linea[] = [
  {
    id: 'lin-01',
    numero: '1',
    nombre: 'Costanera — Polideportivo',
    color: '#E11D48',
    empresa: 'Transporte Mariano Moreno',
    activa: true,
    recorridos: [
      {
        sentido: 'ida',
        destino: 'hacia Polideportivo',
        trazado: [
          { latitud: -31.7225, longitud: -60.5350 }, // Costanera Baja
          { latitud: -31.7260, longitud: -60.5330 },
          { latitud: -31.7312, longitud: -60.5315 }, // Casa de Gobierno
          { latitud: -31.7345, longitud: -60.5298 }, // San Martín y 25 de Mayo
          { latitud: -31.7380, longitud: -60.5280 }, // Hospital San Martín
          { latitud: -31.7450, longitud: -60.5230 },
          { latitud: -31.7520, longitud: -60.5180 }, // Polideportivo
        ],
        paradaIds: ['par-105', 'par-102', 'par-107'],
      },
      {
        sentido: 'vuelta',
        destino: 'hacia Costanera',
        trazado: [
          { latitud: -31.7520, longitud: -60.5180 }, // Polideportivo
          { latitud: -31.7450, longitud: -60.5230 },
          { latitud: -31.7380, longitud: -60.5280 }, // Hospital San Martín
          { latitud: -31.7345, longitud: -60.5298 }, // San Martín y 25 de Mayo
          { latitud: -31.7260, longitud: -60.5330 },
          { latitud: -31.7225, longitud: -60.5350 }, // Costanera Baja
        ],
        paradaIds: ['par-107', 'par-102', 'par-105'],
      },
    ],
  },
  {
    id: 'lin-02',
    numero: '2',
    nombre: 'Parque Industrial — Centro',
    color: '#F59E0B',
    empresa: 'ERSA Urbano',
    activa: true,
    recorridos: [
      {
        sentido: 'ida',
        destino: 'hacia Centro',
        trazado: [
          { latitud: -31.7460, longitud: -60.4850 }, // Parque Industrial
          { latitud: -31.7440, longitud: -60.5050 },
          { latitud: -31.7420, longitud: -60.5180 }, // Terminal
          { latitud: -31.7380, longitud: -60.5280 }, // Hospital San Martín
          { latitud: -31.7312, longitud: -60.5315 }, // Casa de Gobierno
        ],
        paradaIds: ['par-106', 'par-107', 'par-103'],
      },
      {
        sentido: 'vuelta',
        destino: 'hacia Parque Industrial',
        trazado: [
          { latitud: -31.7312, longitud: -60.5315 }, // Casa de Gobierno
          { latitud: -31.7380, longitud: -60.5280 }, // Hospital San Martín
          { latitud: -31.7420, longitud: -60.5180 }, // Terminal
          { latitud: -31.7440, longitud: -60.5050 },
          { latitud: -31.7460, longitud: -60.4850 }, // Parque Industrial
        ],
        paradaIds: ['par-103', 'par-107', 'par-106'],
      },
    ],
  },
  {
    id: 'lin-05',
    numero: '5',
    nombre: 'Puerto Viejo — San Agustín',
    color: '#1B6CA8',
    empresa: 'Transporte Mariano Moreno',
    activa: true,
    recorridos: [
      {
        sentido: 'ida',
        destino: 'hacia San Agustín',
        trazado: [
          { latitud: -31.7200, longitud: -60.5410 }, // Puerto Viejo
          { latitud: -31.7260, longitud: -60.5390 }, // Parque Urquiza
          { latitud: -31.7333, longitud: -60.5241 }, // Alameda y Urquiza
          { latitud: -31.7328, longitud: -60.5262 }, // Plaza Alvear
          { latitud: -31.7345, longitud: -60.5298 }, // Peatonal San Martín
          { latitud: -31.7380, longitud: -60.5280 }, // Hospital San Martín
          { latitud: -31.7480, longitud: -60.5420 }, // San Agustín
        ],
        paradaIds: ['par-101', 'par-104', 'par-102', 'par-107'],
      },
      {
        sentido: 'vuelta',
        destino: 'hacia Puerto Viejo',
        trazado: [
          { latitud: -31.7480, longitud: -60.5420 }, // San Agustín
          { latitud: -31.7380, longitud: -60.5280 }, // Hospital San Martín
          { latitud: -31.7345, longitud: -60.5298 }, // Peatonal San Martín
          { latitud: -31.7328, longitud: -60.5262 }, // Plaza Alvear
          { latitud: -31.7333, longitud: -60.5241 }, // Alameda y Urquiza
          { latitud: -31.7200, longitud: -60.5410 }, // Puerto Viejo
        ],
        paradaIds: ['par-107', 'par-102', 'par-104', 'par-101'],
      },
    ],
  },
  {
    id: 'lin-14',
    numero: '14',
    nombre: 'Bajada Grande — San Benito',
    color: '#10B981',
    empresa: 'ERSA Urbano',
    activa: true,
    recorridos: [
      {
        sentido: 'ida',
        destino: 'hacia San Benito',
        trazado: [
          { latitud: -31.7160, longitud: -60.5600 }, // Bajada Grande
          { latitud: -31.7260, longitud: -60.5390 }, // Parque Urquiza
          { latitud: -31.7333, longitud: -60.5241 }, // Alameda y Urquiza
          { latitud: -31.7328, longitud: -60.5262 }, // Plaza Alvear
          { latitud: -31.7420, longitud: -60.5180 }, // Terminal
          { latitud: -31.7750, longitud: -60.4500 }, // San Benito
        ],
        paradaIds: ['par-108', 'par-101', 'par-104', 'par-106'],
      },
      {
        sentido: 'vuelta',
        destino: 'hacia Bajada Grande',
        trazado: [
          { latitud: -31.7750, longitud: -60.4500 }, // San Benito
          { latitud: -31.7420, longitud: -60.5180 }, // Terminal
          { latitud: -31.7328, longitud: -60.5262 }, // Plaza Alvear
          { latitud: -31.7333, longitud: -60.5241 }, // Alameda y Urquiza
          { latitud: -31.7260, longitud: -60.5390 }, // Parque Urquiza
          { latitud: -31.7160, longitud: -60.5600 }, // Bajada Grande
        ],
        paradaIds: ['par-106', 'par-104', 'par-101', 'par-108'],
      },
    ],
  },
  {
    id: 'lin-15',
    numero: '15',
    nombre: 'Oro Verde — Casa de Gobierno',
    color: '#8B5CF6',
    empresa: 'Transporte Mariano Moreno',
    activa: true,
    recorridos: [
      {
        sentido: 'ida',
        destino: 'hacia Casa de Gobierno',
        trazado: [
          { latitud: -31.8150, longitud: -60.5150 }, // Oro Verde
          { latitud: -31.7650, longitud: -60.5160 },
          { latitud: -31.7420, longitud: -60.5180 }, // Terminal
          { latitud: -31.7345, longitud: -60.5298 }, // San Martín
          { latitud: -31.7312, longitud: -60.5315 }, // Casa de Gobierno
        ],
        paradaIds: ['par-106', 'par-102', 'par-103'],
      },
      {
        sentido: 'vuelta',
        destino: 'hacia Oro Verde',
        trazado: [
          { latitud: -31.7312, longitud: -60.5315 }, // Casa de Gobierno
          { latitud: -31.7345, longitud: -60.5298 }, // San Martín
          { latitud: -31.7420, longitud: -60.5180 }, // Terminal
          { latitud: -31.7650, longitud: -60.5160 },
          { latitud: -31.8150, longitud: -60.5150 }, // Oro Verde
        ],
        paradaIds: ['par-103', 'par-102', 'par-106'],
      },
    ],
  },
];
