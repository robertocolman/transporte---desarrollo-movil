import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { schedulesService, ProximoArribo } from '@/services/schedulesService';
import { notificationsService } from '@/services/notificationsService';
import { ThemedText } from './ThemedText';

interface Props {
  paradaId: string;
  nombreParada: string;
}

export function NextArrivalsWidget({ paradaId, nombreParada }: Props) {
  const { paleta } = useTheme();
  const [arribos, setArribos] = useState<ProximoArribo[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [recordatorioId, setRecordatorioId] = useState<string | null>(null);

  const cargarArribos = async () => {
    setCargando(true);
    const data = await schedulesService.calcularProximosArribos(paradaId);
    setArribos(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarArribos();
    // Refresco automático cada 30 segundos
    const timer = setInterval(cargarArribos, 30000);
    return () => clearInterval(timer);
  }, [paradaId]);

  const agendarNotificacion = async (arribo: ProximoArribo) => {
    const notifId = await notificationsService.programarAvisoArribo(
      arribo.lineaNumero,
      nombreParada,
      arribo.minutosRestantes
    );

    if (notifId) {
      setRecordatorioId(arribo.horarioId);
      Alert.alert(
        '🔔 Recordatorio Activado',
        `Te avisaremos con una notificación local cuando la Línea ${arribo.lineaNumero} esté llegando a la parada "${nombreParada}".`
      );
    } else {
      Alert.alert(
        'Permiso Requerido',
        'Por favor habilitá los permisos de notificaciones para recibir alertas de arribo.'
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="time" size={20} color={paleta.primary} />
          <ThemedText variant="bold" style={styles.headerTitle}>
            Próximos Arribos en Tiempo Real
          </ThemedText>
        </View>

        <Pressable onPress={cargarArribos} hitSlop={8}>
          <Ionicons name="refresh" size={18} color={paleta.textMuted} />
        </Pressable>
      </View>

      {cargando ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={paleta.primary} />
          <ThemedText variant="caption" color={paleta.textMuted} style={{ marginLeft: 8 }}>
            Calculando frecuencias...
          </ThemedText>
        </View>
      ) : arribos.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="moon-outline" size={24} color={paleta.textMuted} />
          <ThemedText variant="caption" color={paleta.textMuted} style={{ marginTop: 6, textAlign: 'center' }}>
            No hay unidades programadas para los próximos 90 minutos según la tabla horaria.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.list}>
          {arribos.map((item) => {
            const esInminente = item.minutosRestantes <= 5;
            const tieneAlarma = recordatorioId === item.horarioId;

            return (
              <View
                key={item.horarioId}
                style={[
                  styles.arriboItem,
                  {
                    backgroundColor: paleta.surfaceHighlight,
                    borderColor: esInminente ? paleta.success : paleta.border,
                  },
                ]}
              >
                {/* Badge de Línea */}
                <View style={[styles.lineBadge, { backgroundColor: item.lineaColor }]}>
                  <ThemedText variant="bold" color="#FFFFFF">
                    L{item.lineaNumero}
                  </ThemedText>
                </View>

                {/* Destino y Hora */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText variant="bold" numberOfLines={1}>
                    {item.destino}
                  </ThemedText>
                  <ThemedText variant="caption" color={paleta.textMuted}>
                    Hora programada: {item.horaProgramada} hs
                  </ThemedText>
                </View>

                {/* Minutos Restantes */}
                <View style={styles.tiempoContainer}>
                  <View
                    style={[
                      styles.tiempoBadge,
                      {
                        backgroundColor: esInminente ? `${paleta.success}20` : `${paleta.primary}15`,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="bold"
                      color={esInminente ? paleta.success : paleta.primary}
                    >
                      {item.minutosRestantes === 0
                        ? '¡Llegando!'
                        : `En ${item.minutosRestantes} min`}
                    </ThemedText>
                  </View>

                  {/* Botón de Recordatorio */}
                  <Pressable
                    style={styles.notifBtn}
                    onPress={() => agendarNotificacion(item)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={tieneAlarma ? 'notifications' : 'notifications-outline'}
                      size={18}
                      color={tieneAlarma ? paleta.accent : paleta.textMuted}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })}
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
    alignItems: 'center',
    marginBottom: 12,
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
  list: {
    gap: 10,
  },
  arriboItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  lineBadge: {
    width: 44,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiempoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tiempoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  notifBtn: {
    padding: 4,
  },
});
