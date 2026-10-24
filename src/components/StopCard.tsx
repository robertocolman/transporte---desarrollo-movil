import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { ParadaConDistancia } from '@/services/stopsService';
import { ThemedText } from './ThemedText';
import { EstrellaFavoritoParada } from './EstrellaFavoritoParada';

interface StopCardProps {
  parada: ParadaConDistancia;
}

export function StopCard({ parada }: StopCardProps) {
  const { paleta } = useTheme();
  const router = useRouter();

  const formattedDistance =
    parada.distanciaMetros !== undefined
      ? parada.distanciaMetros < 1000
        ? `${parada.distanciaMetros} m`
        : `${(parada.distanciaMetros / 1000).toFixed(1)} km`
      : null;

  return (
    <Pressable
      onPress={() => router.push(`/paradas/${parada.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: paleta.surface,
          borderColor: paleta.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.nameContainer}>
          <ThemedText variant="subtitle" numberOfLines={1}>
            {parada.nombre}
          </ThemedText>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.sentidoBadge,
                { backgroundColor: paleta.surfaceHighlight },
              ]}
            >
              <ThemedText variant="caption" color={paleta.textMuted}>
                Sentido: {parada.sentido.toUpperCase()}
              </ThemedText>
            </View>

            {parada.refugio && (
              <View
                style={[
                  styles.refugioBadge,
                  { backgroundColor: `${paleta.success}20` },
                ]}
              >
                <Ionicons name="umbrella-outline" size={12} color={paleta.success} />
                <ThemedText
                  variant="caption"
                  color={paleta.success}
                  style={{ marginLeft: 4, fontWeight: '600' }}
                >
                  Con garita
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rightContainer}>
        {formattedDistance && (
          <View
            style={[
              styles.distanceBadge,
              { backgroundColor: `${paleta.primary}15` },
            ]}
          >
          <Ionicons name="location-sharp" size={14} color={paleta.primary} />
            <ThemedText
              variant="bold"
              color={paleta.primary}
              style={{ marginLeft: 2 }}
            >
              {formattedDistance}
            </ThemedText>
          </View>
        )}

        <View style={styles.starContainer}>
          <EstrellaFavoritoParada paradaId={parada.id} />
        </View>
      </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.linesRow}>
          <ThemedText variant="caption" color={paleta.textMuted} style={{ marginRight: 6 }}>
            Líneas:
          </ThemedText>
          {parada.lineaIds.map((lId) => {
            const num = lId.replace('lin-', '').replace(/^0+/, '');
            return (
              <View
                key={lId}
                style={[styles.linePill, { backgroundColor: paleta.primary }]}
              >
                <ThemedText variant="bold" color={paleta.onPrimary} style={styles.lineText}>
                  L{num}
                </ThemedText>
              </View>
            );
          })}
        </View>

        <View style={styles.arrowRow}>
          {parada.codigoQr && (
            <Ionicons
              name="qr-code-outline"
              size={18}
              color={paleta.textMuted}
              style={{ marginRight: 6 }}
            />
          )}
          <Ionicons name="chevron-forward" size={18} color={paleta.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flex: 1,
    paddingRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  sentidoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  refugioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#33415525',
  },
  linesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  lineText: {
    fontSize: 12,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  starContainer: {
    padding: 4,
  },
});
