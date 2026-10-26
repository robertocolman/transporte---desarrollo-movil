import { Linea, Recorrido, Sentido } from '@/types';
import { mockLineas } from '@/mocks/lines';

export const linesService = {
  /**
   * Obtiene todas las líneas de transporte urbano de Paraná
   */
  async getAllLines(): Promise<Linea[]> {
    return Promise.resolve(mockLineas.filter((l) => l.activa));
  },

  /**
   * Obtiene una línea específica por su ID
   */
  async getLineById(id: string): Promise<Linea | undefined> {
    const linea = mockLineas.find((l) => l.id === id);
    return Promise.resolve(linea);
  },

  /**
   * Obtiene el recorrido específico de una línea según el sentido (ida o vuelta)
   */
  async getRecorrido(lineaId: string, sentido: Sentido): Promise<Recorrido | undefined> {
    const linea = mockLineas.find((l) => l.id === lineaId);
    if (!linea) return undefined;
    return Promise.resolve(linea.recorridos.find((r) => r.sentido === sentido));
  },

  /**
   * Busca líneas por número o por nombre de destino
   */
  async searchLines(query: string): Promise<Linea[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllLines();

    return Promise.resolve(
      mockLineas.filter(
        (l) =>
          l.numero.toLowerCase().includes(q) ||
          l.nombre.toLowerCase().includes(q) ||
          l.empresa.toLowerCase().includes(q)
      )
    );
  },
};
