import { Aviso } from '@/types';

export const mockAvisos: Aviso[] = [
  {
    id: 'avi-01',
    titulo: 'Desvío por obras de repavimentación en Av. Ramírez',
    detalle:
      'Por trabajos de fresado y asfalto en Av. Ramírez entre Almirante Brown y Don Bosco, las Líneas 1 y 15 desvían por calle Churruarín en sentido hacia el centro.',
    lineaIds: ['lin-01', 'lin-15'],
    desde: '2026-10-20T08:00:00-03:00',
    hasta: '2026-10-31T20:00:00-03:00',
    gravedad: 'desvio',
    trazadoAlternativo: [
      { latitud: -31.7450, longitud: -60.5230 },
      { latitud: -31.7420, longitud: -60.5200 },
      { latitud: -31.7380, longitud: -60.5280 },
    ],
    videoUrl: null,
  },
  {
    id: 'avi-02',
    titulo: 'Campaña de Educación Vial: Respeto al Carril Exclusivo',
    detalle:
      'La Municipalidad de Paraná recuerda que los carriles exclusivos para transporte público mejoran los tiempos de viaje y la seguridad de todos los vecinos. Mirá el instructivo explicativo.',
    lineaIds: ['lin-01', 'lin-02', 'lin-05', 'lin-14', 'lin-15'],
    desde: '2026-10-15T00:00:00-03:00',
    hasta: null,
    gravedad: 'informativo',
    trazadoAlternativo: null,
    // Video de muestra MP4 público y compatible para expo-video
    videoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 'avi-03',
    titulo: 'Cabecera Provisoria para Línea 5 en Puerto Viejo',
    detalle:
      'Debido a festividades comunitarias en la zona portuaria, el ascenso y descenso se traslada 150 metros sobre calle Estrada.',
    lineaIds: ['lin-05'],
    desde: '2026-10-25T14:00:00-03:00',
    hasta: '2026-10-28T23:59:00-03:00',
    gravedad: 'informativo',
    trazadoAlternativo: null,
    videoUrl: null,
  },
];
