import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { avisosService } from '@/services/avisosService';
import { Aviso, Gravedad } from '@/types';
import { ThemedText } from '@/components/ThemedText';

/**
 * Componente que reproduce video institucional usando la API moderna expo-video
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
        allowsFullscreen
        allowsPictureInPicture
        contentFit="contain"
      />
      <ThemedText variant="caption" color="#64748B" style={styles.videoHint}>
        ▶️ Reproductor oficial de seguridad vial (expo-video)
      </ThemedText>
    </View>
  );
}

export default function AvisosScreen() {
  const { paleta } = useTheme();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    async function cargarAvisos() {
      setCargando(true);
      const data = await avisosService.getAvisos();
      setAvisos(data);
      setCargando(false);
    }
    cargarAvisos();
  }, []);

  const getGravedadBadge = (gravedad: Gravedad) => {
    switch (gravedad) {
      case 'suspension':
        return {
          bg: `${paleta.danger}15`,
          color: paleta.danger,
          icon: 'alert-circle',
          label: 'SUSPENSIÓN DEL SERVICIO',
        };
      case 'desvio':
        return {
          bg: '#FEF3C7',
          color: '#D97706',
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
      <View style={[styles.avisoCard, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
        {/* Badge de Gravedad */}
        <View style={styles.cardTop}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon as any} size={14} color={badge.color} />
            <ThemedText variant="caption" color={badge.color} style={styles.badgeLabel}>
              {badge.label}
            </ThemedText>
          </View>
          <ThemedText variant="caption" color={paleta.textMuted}>
            {new Date(item.desde).toLocaleDateString('es-AR')}
          </ThemedText>
        </View>

        {/* Título y Detalle */}
        <ThemedText variant="subtitle" style={styles.avisoTitle}>
          {item.titulo}
        </ThemedText>
        <ThemedText variant="body" color={paleta.text} style={styles.avisoDetalle}>
          {item.detalle}
        </ThemedText>

        {/* Líneas Afectadas */}
        {item.lineaIds.length > 0 && (
          <View style={styles.lineasRow}>
            <ThemedText variant="caption" color={paleta.textMuted} style={{ fontWeight: '600' }}>
              Líneas involucradas:
            </ThemedText>
            <View style={styles.badgesWrap}>
              {item.lineaIds.map((lId) => (
                <View key={lId} style={[styles.miniBadge, { backgroundColor: paleta.surfaceHighlight }]}>
                  <ThemedText variant="caption" color={paleta.text} style={{ fontWeight: '700' }}>
                    {lId.replace('lin-0', 'L').replace('lin-', 'L')}
                  </ThemedText>
                </View>
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
      ) : (
        <FlatList
          data={avisos}
          keyExtractor={(item) => item.id}
          renderItem={renderAviso}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerNotice}>
              <ThemedText variant="title">Cartelera de Avisos</ThemedText>
              <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 4 }}>
                Novedades del servicio, desvíos por obras viales y campañas educativas en Paraná.
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
  lineasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
});
