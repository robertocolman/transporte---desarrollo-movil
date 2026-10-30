import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { FavoritosRapidos } from '@/components/FavoritosRapidos';
import { stopsService } from '@/services/stopsService';
import { Parada } from '@/types';

const PARADAS_DESTACADAS_IDS = ['par-101', 'par-105', 'par-106'];

function formatStopButtonLabel(parada: Parada): string {
  const lineasLabel = parada.lineaIds
    .slice(0, 3)
    .map((id) => `L${id.replace(/^lin-0?/, '')}`)
    .join(', ');
  return lineasLabel ? `${parada.nombre} (${lineasLabel})` : parada.nombre;
}

export default function HomeScreen() {
  const { paleta } = useTheme();
  const router = useRouter();

  const [paradasFrecuentes, setParadasFrecuentes] = useState<Parada[]>([]);
  const [cargandoParadas, setCargandoParadas] = useState<boolean>(true);
  const [errorParadas, setErrorParadas] = useState<string | null>(null);

  const cargarParadasDestacadas = useCallback(async () => {
    try {
      setCargandoParadas(true);
      setErrorParadas(null);
      const todas = await stopsService.getAllStops();
      const seleccionadas = PARADAS_DESTACADAS_IDS.map((id) =>
        todas.find((p) => p.id === id)
      ).filter((p): p is Parada => Boolean(p));

      setParadasFrecuentes(
        seleccionadas.length > 0 ? seleccionadas : todas.slice(0, 3)
      );
    } catch (err: any) {
      setErrorParadas(
        err instanceof Error
          ? err.message
          : 'No pudimos cargar las paradas principales.'
      );
    } finally {
      setCargandoParadas(false);
    }
  }, []);

  useEffect(() => {
    cargarParadasDestacadas();
  }, [cargarParadasDestacadas]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: paleta.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Banner de Bienvenida */}
      <View
        style={[
          styles.heroCard,
          { backgroundColor: paleta.surface, borderColor: paleta.border },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: `${paleta.primary}20` },
          ]}
        >
          <Ionicons name="bus" size={38} color={paleta.primary} />
        </View>
        <ThemedText variant="title" style={styles.heroTitle}>
          Transporte Paraná
        </ThemedText>
        <ThemedText
          variant="body"
          color={paleta.textMuted}
          style={styles.heroSubtitle}
        >
          Dirección de Transporte de la Municipalidad de Paraná.
        </ThemedText>
        <View style={[styles.tag, { backgroundColor: `${paleta.accent}15` }]}>
          <ThemedText
            variant="caption"
            color={paleta.accent}
            style={{ fontWeight: '700' }}
          >
            RED URBANA DE COLECTIVOS
          </ThemedText>
        </View>
      </View>

      <FavoritosRapidos />

      {/* Acciones Rápidas */}
      <View style={styles.section}>
        <ThemedText variant="subtitle" style={styles.sectionTitle}>
          Servicios para el Pasajero
        </ThemedText>

        <Button
          title="📍 Ver Paradas Cercanas y Mapa"
          variant="primary"
          style={styles.actionButton}
          onPress={() => router.push('/paradas')}
        />

        <Button
          title="🚍 Ver Líneas y Recorridos en Mapa"
          variant="secondary"
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/lineas')}
        />

        <Button
          title="📢 Avisos Oficiales y Video de Tránsito"
          variant="outline"
          style={styles.actionButton}
          onPress={() => router.push('/avisos')}
        />

        <Button
          title="📷 Escanear Código QR de Parada"
          variant="outline"
          style={styles.actionButton}
          onPress={() => router.push('/paradas/escanear-qr')}
        />
      </View>

      {/* Accesos Rápidos a Paradas Frecuentes */}
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: paleta.surfaceHighlight,
            borderColor: paleta.border,
          },
        ]}
      >
        <ThemedText variant="bold" color={paleta.text}>
          ⚡ Paradas Frecuentes:
        </ThemedText>
        <ThemedText
          variant="body"
          color={paleta.textMuted}
          style={{ marginTop: 4 }}
        >
          Acceso directo a paradas principales de la red:
        </ThemedText>

        {cargandoParadas ? (
          <View style={styles.feedbackBox}>
            <ActivityIndicator size="small" color={paleta.primary} />
            <ThemedText
              variant="caption"
              color={paleta.textMuted}
              style={{ marginLeft: 8 }}
            >
              Sincronizando paradas...
            </ThemedText>
          </View>
        ) : errorParadas ? (
          <View style={styles.errorBox}>
            <ThemedText variant="caption" color={paleta.textMuted}>
              {errorParadas}
            </ThemedText>
            <Button
              title="Reintentar"
              variant="outline"
              style={{ marginTop: 8 }}
              onPress={cargarParadasDestacadas}
            />
          </View>
        ) : paradasFrecuentes.length === 0 ? (
          <ThemedText
            variant="caption"
            color={paleta.textMuted}
            style={{ marginTop: 10 }}
          >
            No hay paradas disponibles en este momento.
          </ThemedText>
        ) : (
          <View style={styles.quickLinks}>
            {paradasFrecuentes.map((parada) => (
              <Button
                key={parada.id}
                title={formatStopButtonLabel(parada)}
                variant="secondary"
                style={styles.linkBtn}
                onPress={() => router.push(`/paradas/${parada.id}` as any)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    textAlign: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 14,
  },
  actionButton: {
    marginBottom: 12,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  quickLinks: {
    marginTop: 12,
    gap: 8,
  },
  linkBtn: {
    paddingVertical: 10,
    minHeight: 40,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  errorBox: {
    marginTop: 12,
  },
});
