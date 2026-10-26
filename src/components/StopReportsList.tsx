
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { API_URL } from '../config/api';
import { useTheme } from '../hooks/use-theme';
import { ThemedText } from './ThemedText';

import type { ReporteDeDemora, MotivoDemora } from '../types';

import {
  listarReportesDeParada,
  type ReporteLocal,
} from '../services/reportsService';

import {
  obtenerReportesApi,
  confirmarReporteApi,
} from '../services/reportsApiService';

import { obtenerUsuarioReportes } from '../services/reportUserService';

const nombresMotivos: Record<MotivoDemora, string> = {
  no_paso: 'El colectivo no pasó',
  paso_lleno: 'El colectivo pasó lleno',
  demorado: 'El colectivo está demorado',
  unidad_rota: 'La unidad está rota',
  calle_cortada: 'La calle está cortada',
};

interface Props {
  paradaId: string;
}

// La API local puede devolver URLs con localhost.
// En el celular debemos usar la dirección de la API
// configurada en src/config/api.ts.
function obtenerUrlFoto(uri: string): string {
  if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
    return uri;
  }

  try {
    const url = new URL(uri);

    if (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1'
    ) {
      return `${API_URL.replace(/\/$/, '')}${url.pathname}${url.search}`;
    }

    return uri;
  } catch {
    return uri;
  }
}

function esReporteRechazado(
  reporte: ReporteDeDemora
): boolean {
  return (
    (reporte as ReporteLocal).estadoEnvio === 'rechazado'
  );
}

function obtenerEstadoReporte(
  reporte: ReporteDeDemora
): string {
  if (esReporteRechazado(reporte)) {
    return 'Rechazado';
  }

  return reporte.sincronizado
    ? 'Publicado'
    : 'Pendiente de sincronización';
}

export function StopReportsList({ paradaId }: Props) {
  const { paleta } = useTheme();

  const [reportes, setReportes] = useState<ReporteDeDemora[]>([]);
  const [rechazados, setRechazados] = useState<ReporteLocal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');

  const cargarReportes = useCallback(async () => {
    setCargando(true);

    try {
      const locales = await listarReportesDeParada(paradaId);

      let usuarioId: string | null = null;

      try {
        usuarioId = await obtenerUsuarioReportes();
      } catch {
        // Sin sesión, no mostramos reportes privados locales.
      }

      const propios = locales.filter(
        (reporte) =>
          usuarioId !== null &&
          reporte.usuarioId === usuarioId
      );

      // La API muestra reportes activos de los últimos 90 minutos.
      const limite = Date.now() - 90 * 60 * 1000;

      const pendientes = propios.filter(
        (reporte) =>
          reporte.estadoEnvio === 'pendiente' &&
          new Date(reporte.fechaHora).getTime() >= limite
      );

      // Los rechazados no forman parte de las demoras activas.
      // Se muestran en una sección informativa independiente.
      const rechazadosPropios = propios.filter(
        (reporte) =>
          reporte.estadoEnvio === 'rechazado'
      );

      setRechazados(rechazadosPropios);

      try {
        const remotos = await obtenerReportesApi(paradaId);

        const idsRemotos = new Set(
          remotos.map((reporte) => reporte.id)
        );

        const combinados = [
          ...remotos,
          ...pendientes.filter(
            (reporte) => !idsRemotos.has(reporte.id)
          ),
        ];

        combinados.sort(
          (a, b) =>
            new Date(b.fechaHora).getTime() -
            new Date(a.fechaHora).getTime()
        );

        setReportes(combinados);
        setMensaje('');
      } catch {
        // Si la API falla, conservamos los reportes propios pendientes.
        setReportes(pendientes);
        setMensaje(
          'No se pudo conectar con el servidor. ' +
          'Se muestran tus reportes pendientes.'
        );
      }
    } catch (error) {
      console.error('Error al cargar reportes:', error);

      setReportes([]);
      setRechazados([]);
      setMensaje('No se pudieron cargar los reportes.');
    } finally {
      setCargando(false);
    }
  }, [paradaId]);

  useFocusEffect(
    useCallback(() => {
      void cargarReportes();
    }, [cargarReportes])
  );

  async function confirmar(reporte: ReporteDeDemora) {
    if (confirmandoId !== null) return;

    if (!reporte.sincronizado || esReporteRechazado(reporte)) {
      Alert.alert(
        'Reporte no disponible',
        'Solo se pueden confirmar reportes publicados.'
      );
      return;
    }

    setConfirmandoId(reporte.id);

    try {
      await confirmarReporteApi(reporte.id);

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      await cargarReportes();
    } catch (error) {
      Alert.alert(
        'No se pudo confirmar',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al confirmar el reporte.'
      );
    } finally {
      setConfirmandoId(null);
    }
  }

  return (
    <View style={styles.contenedor}>
      <ThemedText variant="subtitle">
        Reportes comunitarios
      </ThemedText>

      {cargando ? (
        <ActivityIndicator color={paleta.primary} />
      ) : (
        <>
          {!!mensaje && (
            <ThemedText color={paleta.textMuted}>
              {mensaje}
            </ThemedText>
          )}

          {reportes.length === 0 ? (
            <ThemedText color={paleta.textMuted}>
              No hay reportes activos disponibles para esta parada.
            </ThemedText>
          ) : (
            reportes.map((reporte) => {
              const puedeConfirmar =
                reporte.sincronizado &&
                !esReporteRechazado(reporte);

              return (
                <View
                  key={reporte.id}
                  style={[
                    styles.tarjeta,
                    {
                      backgroundColor: paleta.surface,
                      borderColor: paleta.border,
                    },
                  ]}
                >
                  <ThemedText variant="bold">
                    {nombresMotivos[reporte.motivo]}
                  </ThemedText>

                  <ThemedText
                    variant="caption"
                    color={paleta.textMuted}
                  >
                    Línea: {reporte.lineaId}
                  </ThemedText>

                  <ThemedText
                    variant="caption"
                    color={paleta.textMuted}
                  >
                    {new Date(reporte.fechaHora).toLocaleString('es-AR')}
                  </ThemedText>

                  {!!reporte.comentario && (
                    <ThemedText>
                      {reporte.comentario}
                    </ThemedText>
                  )}

                  {!!reporte.fotoUri && (
                    <Image
                      source={{
                        uri: obtenerUrlFoto(reporte.fotoUri),
                      }}
                      style={styles.foto}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.pie}>
                    <ThemedText
                      variant="caption"
                      color={paleta.textMuted}
                    >
                      {obtenerEstadoReporte(reporte)}
                    </ThemedText>

                    <Pressable
                      disabled={
                        confirmandoId !== null ||
                        !puedeConfirmar
                      }
                      onPress={() => confirmar(reporte)}
                      style={[
                        styles.boton,
                        {
                          backgroundColor: paleta.primary,
                          opacity:
                            confirmandoId !== null ||
                            !puedeConfirmar
                              ? 0.5
                              : 1,
                        },
                      ]}
                    >
                      <ThemedText
                        color="#FFFFFF"
                        variant="bold"
                      >
                        {confirmandoId === reporte.id
                          ? '...'
                          : `+1 · ${reporte.confirmaciones}`}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}

          {rechazados.length > 0 && (
            <View
              style={[
                styles.seccionRechazados,
                {
                  backgroundColor: paleta.surface,
                  borderColor: paleta.border,
                },
              ]}
            >
              <ThemedText variant="bold">
                Reportes no publicados
              </ThemedText>

              <ThemedText color={paleta.textMuted}>
                El servidor rechazó los siguientes reportes.
                Se conservaron en este dispositivo y no se
                muestran como demoras activas.
              </ThemedText>

              {rechazados.map((reporte) => (
                <View
                  key={reporte.id}
                  style={[
                    styles.rechazado,
                    { borderColor: paleta.border },
                  ]}
                >
                  <ThemedText variant="bold">
                    {nombresMotivos[reporte.motivo]}
                  </ThemedText>

                  <ThemedText
                    variant="caption"
                    color={paleta.textMuted}
                  >
                    Línea: {reporte.lineaId}
                  </ThemedText>

                  <ThemedText
                    variant="caption"
                    color={paleta.textMuted}
                  >
                    {new Date(reporte.fechaHora).toLocaleString('es-AR')}
                  </ThemedText>

                  <ThemedText
                    variant="caption"
                    color={paleta.textMuted}
                  >
                    Rechazado — no se publicó
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 12,
    marginTop: 16,
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  foto: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  boton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  seccionRechazados: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  rechazado: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    gap: 4,
  },
});
