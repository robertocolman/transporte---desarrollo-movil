
import { File, Directory, Paths } from 'expo-file-system';

export async function guardarFotoReporte(uri: string): Promise<string> {

  // donde se guardan las fotos
  const carpeta = new Directory(Paths.document, 'fotos-reportes');

  carpeta.create({
    idempotent: true,
    intermediates: true
  });

  // png o jpg
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();

  const ext =
    extension === 'png' || extension === 'webp'
      ? extension
      : 'jpg';

  // nombre foto
  const nombre = `reporte-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // referencias de origen y destino
  const origen = new File(uri);

  // la API permite fotos de hasta 5 MB
  const tamañoMaximo = 5 * 1024 * 1024;
  if (origen.size > tamañoMaximo) {
    throw new Error(
      'La fotografía supera los 5 MB permitidos. Elegí una imagen más pequeña.'
    );
  }
  
  const destino = new File(carpeta, nombre);

  origen.copy(destino);

  return destino.uri;
}
