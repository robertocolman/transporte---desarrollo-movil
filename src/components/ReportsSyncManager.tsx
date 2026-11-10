
import { useEffect } from 'react';
import * as Network from 'expo-network';

import { authService } from '../services/authService';
import { sincronizarReportesPendientes } from '../services/reportsService';

export function ReportsSyncManager() {
  useEffect(() => {
    async function sincronizar() {
      try {
        // No sincronizamos si todavía no hay una sesión iniciada.
        const token = await authService.getToken();

        if (!token) {
          return;
        }

        await sincronizarReportesPendientes();
      } catch (error) {
        console.error('Error al sincronizar reportes:', error);
      }
    }

    // Intentamos sincronizar al iniciar la aplicación.
    void sincronizar();

    // También cuando vuelve la conexión a Internet.
    const suscripcion = Network.addNetworkStateListener((estado) => {
      if (
        estado.isConnected &&
        estado.isInternetReachable !== false
      ) {
        void sincronizar();
      }
    });

    return () => {
      suscripcion.remove();
    };
  }, []);

  return null;
}
