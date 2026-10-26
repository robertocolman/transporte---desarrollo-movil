
import { API_URL } from '../config/api';
import { authService } from './authService';
import type { MotivoDemora, ReporteDeDemora } from '../types';
import { File } from 'expo-file-system';

// datos que recibe la api
export interface ReporteParaEnviar {
  id: string;
  lineaId: string;
  paradaId: string;
  motivo: MotivoDemora;
  comentario: string | null;
  fotoUri: string;
  fechaHora: string;
}

// token
async function obtenerToken(): Promise<string> {
  const token = await authService.getToken();

  if (!token) {
    throw new Error('Tenés que iniciar sesión para realizar esta acción.');
  }

  return token;
}

// verifica la respuesta
export class ErrorApi extends Error {
  constructor(
    public codigo: string,
    public estado: number,
    mensaje: string
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

async function verificarRespuesta(response: Response) {
  const resultado = await response.json();

  if (!response.ok) {
    throw new ErrorApi(
      resultado.error?.codigo || 'ERROR_DESCONOCIDO',
      response.status,
      resultado.error?.mensaje ||
        'Ocurrió un error al comunicarse con el servidor.'
    );
  }

  return resultado;
}


// 1. sube una foto a la api
export async function subirFotoApi(
  fotoUri: string
): Promise<string> {
  const token = await obtenerToken();

  const archivo = new File(fotoUri);

  const formData = new FormData();
  formData.append('archivo', archivo);

  const response = await fetch(`${API_URL}/archivos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const resultado = await verificarRespuesta(response);

  return resultado.datos.url;
}




export async function enviarReporteApi(
  reporte: ReporteParaEnviar,
  fotoUrlExistente?: string,
  alSubirFoto?: (url: string) => Promise<void>
): Promise<ReporteDeDemora> {

  const token = await obtenerToken();

  let fotoUrl = fotoUrlExistente;

  // si todavía no se subió la enviamos a la API
  if (!fotoUrl) {
    fotoUrl = await subirFotoApi(reporte.fotoUri);

    // guardamos la URL antes de intentar publicar el reporte
    if (alSubirFoto) {
      await alSubirFoto(fotoUrl);
    }
  }

  const response = await fetch(`${API_URL}/reportes-demora`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: reporte.id,
      lineaId: reporte.lineaId,
      paradaId: reporte.paradaId,
      motivo: reporte.motivo,
      comentario: reporte.comentario,
      fotoUri: fotoUrl,
      fechaHora: reporte.fechaHora,
    }),
  });

  const resultado = await verificarRespuesta(response);

  return resultado.datos;
}

// 5. consulta los reportes de la parada
export async function obtenerReportesApi(
  paradaId: string
): Promise<ReporteDeDemora[]> {
  const response = await fetch(
    `${API_URL}/reportes-demora?paradaId=${encodeURIComponent(paradaId)}`
  );

  const resultado = await verificarRespuesta(response);

  return resultado.datos;
}

// 6. confirma el reporte
export async function confirmarReporteApi(
  reporteId: string
): Promise<ReporteDeDemora> {
  const token = await obtenerToken();

  const response = await fetch(
    `${API_URL}/reportes-demora/${encodeURIComponent(reporteId)}/confirmaciones`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const resultado = await verificarRespuesta(response);

  return resultado.datos;
}
