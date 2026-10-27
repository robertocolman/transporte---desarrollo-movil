import { Aviso } from '@/types';
import { mockAvisos } from '@/mocks/avisos';

export const avisosService = {
  /**
   * Obtiene todos los avisos y alertas vigentes
   */
  async getAvisos(): Promise<Aviso[]> {
    return Promise.resolve(mockAvisos);
  },

  /**
   * Obtiene avisos que impactan en una línea en particular
   */
  async getAvisosByLinea(lineaId: string): Promise<Aviso[]> {
    return Promise.resolve(mockAvisos.filter((a) => a.lineaIds.includes(lineaId)));
  },

  /**
   * Obtiene un aviso por su identificador
   */
  async getAvisoById(id: string): Promise<Aviso | undefined> {
    return Promise.resolve(mockAvisos.find((a) => a.id === id));
  },
};
