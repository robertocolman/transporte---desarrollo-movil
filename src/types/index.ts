/**
 * Contratos y tipos oficiales de Transporte Público Paraná
 * Extraídos directamente del PRD de la cátedra (pp. 7-11) y contract/api.ts
 * REGLA: Los nombres de los contratos NO se traducen (DT-01).
 */

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export type Sentido = 'ida' | 'vuelta';

export interface Recorrido {
  sentido: Sentido;
  destino: string; // ej: "hacia Puerto Viejo"
  trazado: Coordenadas[]; // Coordenadas para Polyline en el mapa
  paradaIds: string[]; // En orden de paso
}

export interface Linea {
  id: string; // ej: "lin-05"
  numero: string; // ej: "5"
  nombre: string; // ej: "Puerto Viejo — San Agustín"
  color: string; // ej: "#1B6CA8"
  empresa: string;
  recorridos: Recorrido[];
  activa: boolean;
}

export interface Parada {
  id: string; // ej: "par-101"
  nombre: string; // ej: "Alameda y Urquiza"
  coordenadas: Coordenadas;
  lineaIds: string[]; // Líneas que paran acá, ej: ["lin-05", "lin-14"]
  sentido: Sentido;
  refugio: boolean; // Si tiene garita de espera
  codigoQr: string | null; // ej: "PARANA:par-101"
}

export type TipoDeDia = 'habil' | 'sabado' | 'domingo' | 'feriado';

export interface Horario {
  id: string;
  lineaId: string;
  paradaId: string;
  sentido: Sentido;
  tipoDeDia: TipoDeDia;
  hora: string; // Formato "HH:MM", hora de tabla
}

/** Respuesta de GET /feriados (contract/api.ts — decisión D2) */
export interface Feriado {
  fecha: string; // Formato "AAAA-MM-DD"
  nombre: string;
}

export type Gravedad = 'informativo' | 'desvio' | 'suspension';

export interface Aviso {
  id: string;
  titulo: string;
  detalle: string;
  lineaIds: string[];
  desde: string; // ISO 8601 con zona
  hasta: string | null; // ISO 8601 con zona o null
  gravedad: Gravedad;
  trazadoAlternativo: Coordenadas[] | null;
  videoUrl: string | null;
}

export type MotivoDemora =
  | 'no_paso'
  | 'paso_lleno'
  | 'demorado'
  | 'unidad_rota'
  | 'calle_cortada';

export interface ReporteDeDemora {
  id: string;
  lineaId: string;
  paradaId: string;
  usuarioId: string;
  motivo: MotivoDemora;
  comentario: string | null;
  fotoUri: string | null;
  confirmaciones: number;
  fechaHora: string; // ISO 8601 con zona
  sincronizado: boolean;
}

export type Tema = 'claro' | 'oscuro' | 'sistema';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  lineasFavoritas: string[];
  paradasFavoritas: string[];
  avisosActivos: boolean;
  tema: Tema;
}

// Sobres de respuesta oficiales de la API de la cátedra
export interface MetaPaginacion {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface RespuestaLista<T> {
  datos: T[];
  meta: MetaPaginacion;
}

export interface RespuestaUno<T> {
  datos: T;
  meta: null;
}

export interface ApiSuccessResponse<T> {
  datos: T;
  meta: MetaPaginacion | null;
}

export interface ApiErrorResponse {
  error: {
    codigo: string;
    mensaje: string;
  };
}
