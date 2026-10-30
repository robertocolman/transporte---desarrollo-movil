const rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://192.168.0.5:3000';

export const API_URL = rawApiUrl.replace(/\/+$/, '');

/**
 * Normaliza URLs de archivos multimedia (fotos o videos) devueltas por la API.
 * Si el backend local devuelve rutas relativas (/archivos/...) o con localhost,
 * las reescribe usando el host configurado en API_URL para que funcionen en un teléfono real.
 */
export function resolveApiAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) {
    return `${API_URL}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      const apiParsed = new URL(API_URL);
      parsed.protocol = apiParsed.protocol;
      parsed.host = apiParsed.host;
      return parsed.toString();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}
