import { ApiSuccessResponse, Parada } from '@/types';
import { mockParadas } from '@/mocks/stops';
import { mockLineas } from '@/mocks/lines';

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

export const stopsService = {
  /**
   * Obtiene todas las paradas (simula llamada asíncrona a la API)
   */
  async getStops(query?: string): Promise<ApiSuccessResponse<Parada[]>> {
    // Simula latencia de red de 200ms
    await new Promise((resolve) => setTimeout(resolve, 200));

    let resultados = [...mockParadas];
    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      resultados = resultados.filter((p) => p.nombre.toLowerCase().includes(q));
    }

    return {
      datos: resultados,
      meta: {
        total: resultados.length,
        pagina: 1,
        porPagina: 50,
      },
    };
  },

  /**
   * Obtiene paradas ordenadas por cercanía a una coordenada
   */
  async getNearbyStops(
    lat: number,
    lon: number,
    query?: string
  ): Promise<ApiSuccessResponse<ParadaConDistancia[]>> {
    await new Promise((resolve) => setTimeout(resolve, 250));

    let paradas = [...mockParadas];
    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      paradas = paradas.filter((p) => p.nombre.toLowerCase().includes(q));
    }

    const conDistancia: ParadaConDistancia[] = paradas.map((p) => {
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

    conDistancia.sort((a, b) => (a.distanciaMetros ?? 0) - (b.distanciaMetros ?? 0));

    return {
      datos: conDistancia,
      meta: {
        total: conDistancia.length,
        pagina: 1,
        porPagina: 50,
      },
    };
  },

  /**
   * Obtiene el detalle de una parada por su ID
   */
  async getStopById(id: string): Promise<Parada | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const parada = mockParadas.find((p) => p.id === id);
    return parada ?? null;
  },

  /**
   * Busca una parada a partir del código QR escaneado (ej: "PARANA:par-101")
   */
  async getStopByQr(codigoQr: string): Promise<Parada | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const parada = mockParadas.find((p) => p.codigoQr === codigoQr);
    return parada ?? null;
  },

  /**
   * Obtiene la información básica de las líneas que pasan por una parada
   */
  async getLinesForStop(lineaIds: string[]) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return mockLineas.filter((l) => lineaIds.includes(l.id));
  },
};
