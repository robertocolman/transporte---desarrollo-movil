import { Parada } from '@/types';

export const mockParadas: Parada[] = [
  {
    id: 'par-101',
    nombre: 'Alameda y Urquiza',
    coordenadas: {
      latitud: -31.7333,
      longitud: -60.5241,
    },
    lineaIds: ['lin-05', 'lin-14'],
    sentido: 'ida',
    refugio: true,
    codigoQr: 'PARANA:par-101',
  },
  {
    id: 'par-102',
    nombre: 'Peatonal San Martín y 25 de Mayo',
    coordenadas: {
      latitud: -31.7345,
      longitud: -60.5298,
    },
    lineaIds: ['lin-05', 'lin-01', 'lin-15'],
    sentido: 'ida',
    refugio: true,
    codigoQr: 'PARANA:par-102',
  },
  {
    id: 'par-103',
    nombre: 'Casa de Gobierno (Laprida y Santa Fe)',
    coordenadas: {
      latitud: -31.7312,
      longitud: -60.5315,
    },
    lineaIds: ['lin-02', 'lin-07', 'lin-09'],
    sentido: 'ida',
    refugio: true,
    codigoQr: 'PARANA:par-103',
  },
  {
    id: 'par-104',
    nombre: 'Plaza Alvear / Museo Bellas Artes',
    coordenadas: {
      latitud: -31.7328,
      longitud: -60.5262,
    },
    lineaIds: ['lin-05', 'lin-14'],
    sentido: 'ida',
    refugio: false,
    codigoQr: 'PARANA:par-104',
  },
  {
    id: 'par-105',
    nombre: 'Costanera Baja (Monumento Urquiza)',
    coordenadas: {
      latitud: -31.7225,
      longitud: -60.5350,
    },
    lineaIds: ['lin-01', 'lin-14'],
    sentido: 'vuelta',
    refugio: false,
    codigoQr: 'PARANA:par-105',
  },
  {
    id: 'par-106',
    nombre: 'Terminal de Ómnibus Paraná',
    coordenadas: {
      latitud: -31.7420,
      longitud: -60.5180,
    },
    lineaIds: ['lin-02', 'lin-05', 'lin-15'],
    sentido: 'vuelta',
    refugio: true,
    codigoQr: 'PARANA:par-106',
  },
  {
    id: 'par-107',
    nombre: 'Hospital San Martín (Gualeguaychú y Bavio)',
    coordenadas: {
      latitud: -31.7380,
      longitud: -60.5280,
    },
    lineaIds: ['lin-01', 'lin-02', 'lin-05'],
    sentido: 'ida',
    refugio: true,
    codigoQr: 'PARANA:par-107',
  },
  {
    id: 'par-108',
    nombre: 'Parque Urquiza (Rosedal)',
    coordenadas: {
      latitud: -31.7260,
      longitud: -60.5390,
    },
    lineaIds: ['lin-14'],
    sentido: 'ida',
    refugio: false,
    codigoQr: 'PARANA:par-108',
  },
];
