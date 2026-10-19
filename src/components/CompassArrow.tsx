import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './ThemedText';
import { useCompassHeading } from '@/hooks/useCompassHeading';

interface CompassArrowProps {
  targetBearing: number; // Rumbo geográfico hacia la parada (0..360°)
  distanciaMetros?: number;
  nombreParada?: string;
}

export function CompassArrow({
  targetBearing,
  distanciaMetros,
  nombreParada,
}: CompassArrowProps) {
  const { paleta } = useTheme();
  const { isSensorAvailable, getRelativeAngle } = useCompassHeading();

  const angle = getRelativeAngle(targetBearing);

  const formattedDistance =
    distanciaMetros !== undefined
      ? distanciaMetros < 1000
        ? `${distanciaMetros} m`
        : `${(distanciaMetros / 1000).toFixed(1)} km`
      : 'Calculando...';

  return (
    <View style={[styles.container, { backgroundColor: paleta.surfaceHighlight, borderColor: paleta.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.textColumn}>
          <ThemedText variant="caption" color={paleta.textMuted}>
            ORIENTACIÓN A PIE HACIA LA PARADA
          </ThemedText>
          {nombreParada && (
            <ThemedText variant="subtitle" numberOfLines={1}>
              {nombreParada}
            </ThemedText>
          )}
          <ThemedText variant="title" color={paleta.accent} style={{ marginTop: 2 }}>
            a {formattedDistance}
          </ThemedText>
        </View>

        <View style={[styles.compassCircle, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
          {isSensorAvailable ? (
            <View style={{ transform: [{ rotate: `${angle}deg` }] }}>
              <Ionicons name="navigate" size={36} color={paleta.primary} />
            </View>
          ) : (
            <Ionicons name="compass-outline" size={32} color={paleta.textMuted} />
          )}
        </View>
      </View>

      {!isSensorAvailable && (
        <ThemedText variant="caption" color={paleta.textMuted} style={styles.noticeText}>
          (Sensor magnético no disponible en este dispositivo/simulador)
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textColumn: {
    flex: 1,
    paddingRight: 12,
  },
  compassCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noticeText: {
    marginTop: 8,
    fontStyle: 'italic',
  },
});
