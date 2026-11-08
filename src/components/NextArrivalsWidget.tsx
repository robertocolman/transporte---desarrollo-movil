import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import {
  GrupoArribosLinea,
  ProximoArribo,
  schedulesService,
} from '@/services/schedulesService';
import { notificationsService } from '@/services/notificationsService';
import { formatRelativeSyncAge } from '@/services/localDb';
import { TipoDeDia } from '@/types';
import { ThemedText } from './ThemedText';
import { Button } from './Button';

interface Props {
  paradaId: string;
  nombreParada: string;
}

const ETIQUETA_TIPO_DIA: Record<TipoDeDia, string> = {
  habil: 'Día hábil',
  sabado: 'Sábado',
  domingo: 'Domingo',
  feriado: 'Feriado',
};

export function NextArrivalsWidget({ paradaId, nombreParada }: Props) {
  const { paleta } = useTheme();
  const [arribos, setArribos] = useState<ProximoArribo[]>([]);
  const [tipoDiaHoy, setTipoDiaHoy] = useState<TipoDeDia>('habil');
  const [feriadoNombre, setFeriadoNombre] = useState<string | null>(null);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  // Guarda el ID real de cada notificación local para poder cancelarla.
  const [recordatorios, setRecordatorios] = useState<Record<string, string>>({});

  const cargarArribos = useCallback(async () => {
    try {
      setCargando(true);
      setErrorMensaje(null);

      const [infoDia, data, syncIso] = await Promise.all([
        schedulesService.resolverTipoDeDia(),
        schedulesService.calcularProximosArribos(paradaId, 3),
        schedulesService.getUltimaSincronizacionHorarios(),
      ]);

      setTipoDiaHoy(infoDia.tipoDeDia);
      setFeriadoNombre(infoDia.feriadoNombre);
      setArribos(data);
      setUltimaSync(syncIso);
    } catch (error) {
      setErrorMensaje(
        error instanceof Error
          ? error.message
          : 'No pudimos consultar la tabla de horarios.'
      );
      setArribos([]);
    } finally {
      setCargando(false);
    }
  }, [paradaId]);

  useEffect(() => {
    void cargarArribos();
    const timer = setInterval(() => {
      void cargarArribos();
    }, 30_000);
    return () => clearInterval(timer);
  }, [cargarArribos]);

  useEffect(() => {
    let montado = true;

    async function recuperarRecordatorios() {
      const encontrados = await Promise.all(
        arribos.map(async (arribo) => {
          const id = await notificationsService.buscarAvisoArribo(
            arribo.lineaNumero,
            nombreParada,
            arribo.horaProgramada
          );

          return [arribo.horarioId, id] as const;
        })
      );

      if (montado) {
        setRecordatorios(
          Object.fromEntries(
            encontrados.filter(([, id]) => Boolean(id))
          ) as Record<string, string>
        );
      }
    }

    recuperarRecordatorios().catch(() => {});

    return () => {
      montado = false;
    };
  }, [arribos, nombreParada]);

  const agendarNotificacion = async (arribo: ProximoArribo) => {
    const idExistente = recordatorios[arribo.horarioId];

    try {
      if (idExistente) {
        await notificationsService.cancelarAvisoArribo(idExistente);
        setRecordatorios((actuales) => {
          const siguiente = { ...actuales };
          delete siguiente[arribo.horarioId];
          return siguiente;
        });
        Alert.alert(
          'Recordatorio cancelado',
          'Se canceló el recordatorio de este horario.'
        );
        return;
      }

      const notifId = await notificationsService.programarAvisoArribo(
        arribo.lineaNumero,
        nombreParada,
        arribo.horaProgramada
      );

      if (notifId) {
        setRecordatorios((actuales) => ({
          ...actuales,
          [arribo.horarioId]: notifId,
        }));
        Alert.alert(
          'Recordatorio activado',
          `Te avisaremos 10 minutos antes del horario de tabla (${arribo.horaProgramada} hs) de la Línea ${arribo.lineaNumero}.`
        );
      } else {
        Alert.alert(
          'Permiso requerido',
          'Habilitá las notificaciones para recibir recordatorios.'
        );
      }
    } catch (error) {
      Alert.alert(
        'No se pudo programar',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al programar el recordatorio.'
      );
    }
  };

  const gruposPorLinea: GrupoArribosLinea[] =
    schedulesService.agruparArribosPorLinea(arribos);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: paleta.surface, borderColor: paleta.border },
      ]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Ionicons name="time" size={20} color={paleta.primary} />
            <ThemedText variant="bold" style={styles.headerTitle}>
              Próximos arribos según la tabla
            </ThemedText>
          </View>
          <ThemedText
            variant="caption"
            color={paleta.textMuted}
            style={{ marginTop: 2 }}
          >
            Tabla activa: {ETIQUETA_TIPO_DIA[tipoDiaHoy]}
            {feriadoNombre ? ` (${feriadoNombre})` : ''}
            {ultimaSync ? ` · ${formatRelativeSyncAge(ultimaSync)}` : ''}
          </ThemedText>
        </View>

        <Pressable onPress={cargarArribos} hitSlop={8}>
          <Ionicons name="refresh" size={18} color={paleta.textMuted} />
        </Pressable>
      </View>

      {cargando ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={paleta.primary} />
          <ThemedText
            variant="caption"
            color={paleta.textMuted}
            style={{ marginLeft: 8 }}
          >
            Consultando tabla horaria...
          </ThemedText>
        </View>
      ) : errorMensaje ? (
        <View style={styles.emptyBox}>
          <Ionicons name="cloud-offline-outline" size={26} color={paleta.danger} />
          <ThemedText
            variant="caption"
            color={paleta.textMuted}
            style={{ marginTop: 6, textAlign: 'center' }}
          >
            {errorMensaje}
          </ThemedText>
          <Button
            title="Reintentar"
            variant="outline"
            style={{ marginTop: 10 }}
            onPress={cargarArribos}
          />
        </View>
      ) : gruposPorLinea.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="moon-outline" size={24} color={paleta.textMuted} />
          <ThemedText
            variant="caption"
            color={paleta.textMuted}
            style={{ marginTop: 6, textAlign: 'center' }}
          >
            No hay servicios programados en la tabla para hoy ni mañana en esta parada.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.groupsList}>
          {gruposPorLinea.map((grupo) => {
            const itemsParaMostrar = [
              ...grupo.arribosHoy,
              ...grupo.arribosManiana,
            ].slice(0, 3);

            return (
              <View
                key={grupo.lineaId}
                style={[
                  styles.groupCard,
                  {
                    backgroundColor: paleta.surfaceHighlight,
                    borderColor: paleta.border,
                  },
                ]}
              >
                {/* Encabezado de la línea */}
                <View style={styles.groupHeader}>
                  <View
                    style={[
                      styles.lineBadge,
                      { backgroundColor: grupo.lineaColor },
                    ]}
                  >
                    <ThemedText variant="bold" color="#FFFFFF">
                      L{grupo.lineaNumero}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <ThemedText variant="bold" numberOfLines={1}>
                      {grupo.destino}
                    </ThemedText>
                    <ThemedText variant="caption" color={paleta.textMuted}>
                      {grupo.lineaNombre}
                    </ThemedText>
                  </View>
                </View>

                {/* Mensaje explícito del PRD cuando terminó el servicio del día */}
                {grupo.sinServicioHastaManiana && grupo.primerServicioManiana && (
                  <View
                    style={[
                      styles.endOfServiceBox,
                      {
                        backgroundColor: `${paleta.warning}18`,
                        borderColor: `${paleta.warning}55`,
                      },
                    ]}
                  >
                    <Ionicons
                      name="moon-outline"
                      size={15}
                      color={paleta.warning}
                    />
                    <ThemedText
                      variant="caption"
                      color={paleta.text}
                      style={{ flex: 1, marginLeft: 6, fontWeight: '600' }}
                    >
                      No hay más servicio hoy — hasta mañana a las{' '}
                      {grupo.primerServicioManiana} hs
                    </ThemedText>
                  </View>
                )}

                {/* Los 3 próximos horarios de tabla de esta línea */}
                <View style={styles.timesList}>
                  {itemsParaMostrar.map((item) => {
                    const esPronto =
                      !item.esManiana && item.minutosRestantes <= 10;
                    const tieneAlarma = Boolean(recordatorios[item.horarioId]);

                    const textoTiempo = item.esManiana
                      ? `Mañana ${item.horaProgramada} hs`
                      : item.minutosRestantes === 0
                        ? 'Hora actual de tabla'
                        : `En ${item.minutosRestantes} min (tabla)`;

                    return (
                      <View
                        key={item.horarioId}
                        style={[
                          styles.arriboRow,
                          {
                            backgroundColor: paleta.surface,
                            borderColor: esPronto
                              ? paleta.primary
                              : paleta.border,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="bold" style={{ fontSize: 15 }}>
                            {item.horaProgramada} hs
                          </ThemedText>
                          <ThemedText variant="caption" color={paleta.textMuted}>
                            {item.esManiana ? 'Primer turno de mañana' : 'Hora programada'}
                          </ThemedText>
                        </View>

                        <View style={styles.tiempoContainer}>
                          <View
                            style={[
                              styles.tiempoBadge,
                              {
                                backgroundColor: item.esManiana
                                  ? paleta.surfaceHighlight
                                  : `${paleta.primary}15`,
                              },
                            ]}
                          >
                            <ThemedText
                              variant="bold"
                              color={
                                item.esManiana ? paleta.textMuted : paleta.primary
                              }
                              style={{ fontSize: 12 }}
                            >
                              {textoTiempo}
                            </ThemedText>
                          </View>

                          <Pressable
                            style={styles.notifBtn}
                            onPress={() => agendarNotificacion(item)}
                            hitSlop={8}
                            accessibilityLabel={
                              tieneAlarma
                                ? 'Cancelar recordatorio'
                                : 'Programar recordatorio 10 minutos antes'
                            }
                          >
                            <Ionicons
                              name={
                                tieneAlarma
                                  ? 'notifications'
                                  : 'notifications-outline'
                              }
                              size={18}
                              color={tieneAlarma ? paleta.accent : paleta.textMuted}
                            />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <ThemedText
            variant="caption"
            color={paleta.textMuted}
            style={styles.disclaimer}
          >
            Horarios oficiales de tabla (las unidades no cuentan con GPS en tiempo real). Tocá la campana para recibir un aviso 10 min antes.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  groupsList: {
    gap: 12,
  },
  groupCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineBadge: {
    width: 44,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endOfServiceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  timesList: {
    gap: 6,
  },
  arriboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tiempoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tiempoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  notifBtn: {
    padding: 4,
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: 2,
    fontSize: 11,
  },
});
