
import { useEffect } from 'react';
import * as Network from 'expo-network';

import { sincronizarReportesPendientes } from '../services/reportsService';

export function ReportsSyncManager() {

  useEffect(() => {

    async function sincronizar() {
      try {
        await sincronizarReportesPendientes();
      } catch (error) {
        console.error('Error al sincronizar reportes:', error);
      }
    }

    void sincronizar();

    const suscripcion = Network.addNetworkStateListener((estado) => {

      // intenta enviar los reportes pendientes si vuelve internet
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
