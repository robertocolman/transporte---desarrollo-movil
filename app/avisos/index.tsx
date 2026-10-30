import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { avisosService } from '@/services/avisosService';
import { Aviso, Gravedad } from '@/types';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';

/**
 * Componente que reproduce el video adjunto de un aviso usando la API moderna expo-video
 */
function AvisoVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  return (
    <View style={styles.videoContainer}>
      <VideoView
        player={player}
        style={styles.videoPlayer}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
        contentFit="contain"
      />
      <ThemedText variant="caption" color="#CBD5E1" style={styles.videoHint}>
        ▶️ Video informativo de la Dirección de Transporte (expo-video)
      </ThemedText>
    </View>
  );
}

function formatFechaHoraAviso(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AvisosScreen() {
  const { paleta } = useTheme();
  const router = useRouter();

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const cargarAvisos = useCallback(async (esRefresco = false) => {
    try {
      if (esRefresco) {
        setRefrescando(true);
      } else {
        setCargando(true);
      }
      setErrorMensaje(null);

      const data = await avisosService.getAvisos();
      setAvisos(data);
    } catch (err: any) {
      setErrorMensaje(
        err instanceof Error
          ? err.message
          : 'No pudimos conectar con la cartelera de avisos.'
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarAvisos(false);
  }, [cargarAvisos]);

  const getGravedadBadge = (gravedad: Gravedad) => {
    switch (gravedad) {
      case 'suspension':
        return {
          bg: `${paleta.danger}18`,
          color: paleta.danger,
          icon: 'alert-circle',
          label: 'SUSPENSIÓN DEL SERVICIO',
        };
      case 'desvio':
        return {
          bg: `${paleta.warning}20`,
          color: paleta.warning,
          icon: 'warning',
          label: 'DESVÍO DE RECORRIDO',
        };
      case 'informativo':
      default:
        return {
          bg: `${paleta.primary}15`,
          color: paleta.primary,
          icon: 'information-circle',
          label: 'COMUNICADO OFICIAL',
        };
    }
  };

  const renderAviso = ({ item }: { item: Aviso }) => {
    const badge = getGravedadBadge(item.gravedad);

    return (
      <View
        style={[
          styles.avisoCard,
          { backgroundColor: paleta.surface, borderColor: paleta.border },
        ]}
      >
        {/* Badge de Gravedad */}
        <View style={styles.cardTop}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon as any} size={14} color={badge.color} />
            <ThemedText variant="caption" color={badge.color} style={styles.badgeLabel}>
              {badge.label}
            </ThemedText>
          </View>
        </View>

        {/* Título y Detalle */}
        <ThemedText variant="subtitle" style={styles.avisoTitle}>
          {item.titulo}
        </ThemedText>
        <ThemedText variant="body" color={paleta.text} style={styles.avisoDetalle}>
          {item.detalle}
        </ThemedText>

        {/* Vigencia (desde / hasta) */}
        <View
          style={[
            styles.vigenciaBox,
            { backgroundColor: paleta.surfaceHighlight, borderColor: paleta.border },
          ]}
        >
          <Ionicons name="calendar-outline" size={14} color={paleta.textMuted} />
          <ThemedText variant="caption" color={paleta.textMuted} style={{ flex: 1 }}>
            Desde: {formatFechaHoraAviso(item.desde)}
            {'\n'}
            {item.hasta
              ? `Hasta: ${formatFechaHoraAviso(item.hasta)}`
              : 'Hasta: nuevo aviso (sin fecha de fin)'}
          </ThemedText>
        </View>

        {/* Líneas Afectadas (tocables para ver el desvío en el mapa de la línea) */}
        {item.lineaIds.length > 0 && (
          <View style={styles.lineasRow}>
            <ThemedText variant="caption" color={paleta.textMuted} style={{ fontWeight: '600' }}>
              Líneas afectadas (tocá para ver mapa):
            </ThemedText>
            <View style={styles.badgesWrap}>
              {item.lineaIds.map((lId) => (
                <Pressable
                  key={lId}
                  onPress={() => router.push(`/lineas/${lId}` as any)}
                  style={[
                    styles.miniBadge,
                    {
                      backgroundColor: `${paleta.primary}18`,
                      borderColor: `${paleta.primary}45`,
                    },
                  ]}
                >
                  <ThemedText variant="caption" color={paleta.primary} style={{ fontWeight: '700' }}>
                    {lId.replace('lin-0', 'L').replace('lin-', 'L')}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Reproductor de Video si el aviso contiene videoUrl */}
        {item.videoUrl && <AvisoVideoPlayer videoUrl={item.videoUrl} />}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: paleta.background }]}>
      {cargando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={paleta.primary} />
          <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 12 }}>
            Cargando comunicados oficiales...
          </ThemedText>
        </View>
      ) : errorMensaje ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={paleta.danger} />
          <ThemedText variant="subtitle" style={{ marginTop: 12, textAlign: 'center' }}>
            No pudimos cargar los avisos
          </ThemedText>
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
            style={{ marginTop: 16 }}
            onPress={() => cargarAvisos(false)}
          />
        </View>
      ) : (
        <FlatList
          data={avisos}
          keyExtractor={(item) => item.id}
          renderItem={renderAviso}
          contentContainerStyle={styles.listContent}
          refreshing={refrescando}
          onRefresh={() => cargarAvisos(true)}
          ListHeaderComponent={
            <View style={styles.headerNotice}>
              <ThemedText variant="title">Cartelera de Avisos</ThemedText>
              <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 4 }}>
                Desvíos activos, interrupciones de servicio y comunicados de la Dirección de Transporte.
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color={paleta.success} />
              <ThemedText variant="subtitle" style={{ marginTop: 12, textAlign: 'center' }}>
                Sin avisos ni desvíos activos
              </ThemedText>
              <ThemedText
                variant="caption"
                color={paleta.textMuted}
                style={{ marginTop: 6, textAlign: 'center' }}
              >
                Todas las líneas urbanas circulan con normalidad en este momento.
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  headerNotice: {
    marginBottom: 8,
  },
  avisoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeLabel: {
    fontWeight: '700',
    fontSize: 11,
  },
  avisoTitle: {
    fontSize: 17,
    marginBottom: 6,
  },
  avisoDetalle: {
    lineHeight: 22,
    marginBottom: 12,
  },
  vigenciaBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  lineasRow: {
    gap: 6,
    marginBottom: 4,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  videoContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  videoPlayer: {
    width: '100%',
    height: 200,
  },
  videoHint: {
    padding: 8,
    textAlign: 'center',
    backgroundColor: '#1E293B',
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
});
