import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { linesService } from '@/services/linesService';
import { stopsService } from '@/services/stopsService';
import { Linea, Parada, Sentido } from '@/types';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { EstrellaFavorito } from '@/components/EstrellaFavorito';

export default function LineaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paleta } = useTheme();
  const router = useRouter();

  const [linea, setLinea] = useState<Linea | null>(null);
  const [sentido, setSentido] = useState<Sentido>('ida');
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    async function cargarDetalle() {
      if (!id) return;
      setCargando(true);
      const data = await linesService.getLineById(id);
      if (data) {
        setLinea(data);
        const todasLasParadas = await stopsService.getAllStops();
        setParadas(todasLasParadas);
      }
      setCargando(false);
    }
    cargarDetalle();
  }, [id]);

  if (cargando) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: paleta.background }]}>
        <ActivityIndicator size="large" color={paleta.primary} />
        <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 12 }}>
          Cargando recorrido de la línea...
        </ThemedText>
      </View>
    );
  }

  if (!linea) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: paleta.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={paleta.danger} />
        <ThemedText variant="subtitle" style={{ marginTop: 12 }}>
          Línea no encontrada
        </ThemedText>
        <Button
          title="Volver al listado"
          variant="outline"
          style={{ marginTop: 16 }}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const recorridoActual = linea.recorridos.find((r) => r.sentido === sentido);
  const recorridoOpuesto = linea.recorridos.find((r) => r.sentido !== sentido);

  // Mapeo de paradas en el orden exacto del recorrido
  const paradasDelRecorrido: Parada[] = (recorridoActual?.paradaIds || [])
    .map((paradaId) => paradas.find((p) => p.id === paradaId))
    .filter((p): p is Parada => Boolean(p));

  // Coordenadas para Polyline
  const trazadoActualCoords = (recorridoActual?.trazado || []).map((c) => ({
    latitude: c.latitud,
    longitude: c.longitud,
  }));

  const trazadoOpuestoCoords = (recorridoOpuesto?.trazado || []).map((c) => ({
    latitude: c.latitud,
    longitude: c.longitud,
  }));

  // Centro de Paraná para región inicial
  const centroRegion = {
    latitude: trazadoActualCoords[0]?.latitude || -31.733,
    longitude: trazadoActualCoords[0]?.longitude || -60.528,
    latitudeDelta: 0.055,
    longitudeDelta: 0.055,
  };

  return (
    <View style={[styles.container, { backgroundColor: paleta.background }]}>
      {/* Cabecera con info de la línea */}
      <View style={[styles.headerCard, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: linea.color }]}>
            <ThemedText variant="bold" color="#FFFFFF" style={{ fontSize: 18 }}>
              L{linea.numero}
            </ThemedText>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText variant="subtitle">{linea.nombre}</ThemedText>
            <ThemedText variant="caption" color={paleta.textMuted}>
              {linea.empresa}
            </ThemedText>
          </View>
          <EstrellaFavorito tipo="linea" id={linea.id} />
        </View>

        {/* Selector de Sentido (Ida / Vuelta) */}
        <View style={[styles.tabsRow, { backgroundColor: paleta.surfaceHighlight }]}>
          <Pressable
            style={[
              styles.tabBtn,
              sentido === 'ida' && { backgroundColor: paleta.surface, borderColor: paleta.primary, borderWidth: 1 },
            ]}
            onPress={() => setSentido('ida')}
          >
            <Ionicons
              name="arrow-forward"
              size={14}
              color={sentido === 'ida' ? paleta.primary : paleta.textMuted}
            />
            <ThemedText
              variant="bold"
              color={sentido === 'ida' ? paleta.primary : paleta.textMuted}
              style={{ marginLeft: 6, fontSize: 13 }}
            >
              Ida
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.tabBtn,
              sentido === 'vuelta' && { backgroundColor: paleta.surface, borderColor: paleta.primary, borderWidth: 1 },
            ]}
            onPress={() => setSentido('vuelta')}
          >
            <Ionicons
              name="arrow-back"
              size={14}
              color={sentido === 'vuelta' ? paleta.primary : paleta.textMuted}
            />
            <ThemedText
              variant="bold"
              color={sentido === 'vuelta' ? paleta.primary : paleta.textMuted}
              style={{ marginLeft: 6, fontSize: 13 }}
            >
              Vuelta
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText variant="caption" color={paleta.textMuted} style={styles.destinoBanner}>
          Destino actual: <ThemedText variant="bold">{recorridoActual?.destino || 'Circuito general'}</ThemedText>
        </ThemedText>
      </View>

      {/* Mapa interactivo con Polyline y Marcadores */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={centroRegion}
        >
          {/* Trazado del sentido opuesto (línea tenue secundaria) */}
          {trazadoOpuestoCoords.length > 0 && (
            <Polyline
              coordinates={trazadoOpuestoCoords}
              strokeColor="#94A3B8"
              strokeWidth={3}
              lineDashPattern={[6, 4]}
            />
          )}

          {/* Trazado del sentido activo (color oficial de la línea con grosor destacado) */}
          {trazadoActualCoords.length > 0 && (
            <Polyline
              coordinates={trazadoActualCoords}
              strokeColor={linea.color}
              strokeWidth={5}
            />
          )}

          {/* Marcadores de paradas a lo largo del recorrido */}
          {paradasDelRecorrido.map((parada, index) => (
            <Marker
              key={`${parada.id}-${index}`}
              coordinate={{
                latitude: parada.coordenadas.latitud,
                longitude: parada.coordenadas.longitud,
              }}
              title={`${index + 1}. ${parada.nombre}`}
              description={parada.refugio ? 'Con refugio' : 'Poste señalizado'}
              pinColor={linea.color}
            />
          ))}
        </MapView>
      </View>

      {/* Lista ordenada de paradas del recorrido */}
      <View style={[styles.stopsHeader, { backgroundColor: paleta.surface, borderTopColor: paleta.border }]}>
        <ThemedText variant="bold">
          Paradas del Recorrido ({paradasDelRecorrido.length})
        </ThemedText>
        <ThemedText variant="caption" color={paleta.textMuted}>
          En orden de paso
        </ThemedText>
      </View>

      <FlatList
        data={paradasDelRecorrido}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.stopsListContent}
        renderItem={({ item, index }) => (
          <Pressable
            style={({ pressed }) => [
              styles.stopItem,
              {
                backgroundColor: paleta.surface,
                borderColor: paleta.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => router.push(`/paradas/${item.id}` as any)}
          >
            <View style={[styles.orderIndex, { backgroundColor: `${linea.color}20` }]}>
              <ThemedText variant="bold" color={linea.color}>
                {index + 1}
              </ThemedText>
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText variant="bold">{item.nombre}</ThemedText>
              <ThemedText variant="caption" color={paleta.textMuted}>
                {item.refugio ? 'Garita / Refugio' : 'Poste'} · {item.codigoQr || 'Sin QR'}
              </ThemedText>
            </View>

            <Ionicons name="chevron-forward" size={16} color={paleta.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    padding: 14,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 48,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginTop: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  destinoBanner: {
    marginTop: 8,
    textAlign: 'center',
  },
  mapContainer: {
    height: 240,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  stopsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  stopsListContent: {
    padding: 12,
    gap: 8,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  orderIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
