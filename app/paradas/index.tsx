import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/useUserLocation';
import { stopsService, ParadaConDistancia } from '@/services/stopsService';
import { ThemedText } from '@/components/ThemedText';
import { StopCard } from '@/components/StopCard';
import { Button } from '@/components/Button';

// Coordenadas céntricas por defecto de Paraná (Plaza 1° de Mayo)
const PARANA_CENTER = {
  latitude: -31.7333,
  longitude: -60.5297,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

export default function ParadasScreen() {
  const { paleta } = useTheme();
  const router = useRouter();
  const { coords, isLoading: isLocating, isPermissionDenied, refreshLocation } = useUserLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [paradas, setParadas] = useState<ParadaConDistancia[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadParadas = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setErrorMessage(null);

      let response;
      if (coords) {
        // Si tenemos ubicación, calculamos distancias y ordenamos por cercanía
        response = await stopsService.getNearbyStops(coords.latitude, coords.longitude, searchQuery);
      } else {
        // Si no hay GPS (permiso denegado), cargamos el listado general
        response = await stopsService.getStops(searchQuery);
      }

      setParadas(response.datos);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoadingData(false);
    }
  }, [coords, searchQuery]);

  useEffect(() => {
    loadParadas();
  }, [loadParadas]);

  return (
    <View style={[styles.container, { backgroundColor: paleta.background }]}>
      {/* Barra de Búsqueda y Switch de Vista */}
      <View style={[styles.headerControls, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
        <View style={[styles.searchBox, { backgroundColor: paleta.surfaceHighlight, borderColor: paleta.border }]}>
          <Ionicons name="search" size={20} color={paleta.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por calle o nombre..."
            placeholderTextColor={paleta.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: paleta.text }]}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={paleta.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Selector de modo Mapa / Lista */}
        <View style={[styles.modeToggle, { backgroundColor: paleta.surfaceHighlight }]}>
          <Pressable
            style={[
              styles.modeBtn,
              viewMode === 'map' && { backgroundColor: paleta.primary },
            ]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons
              name="map"
              size={18}
              color={viewMode === 'map' ? paleta.onPrimary : paleta.textMuted}
            />
          </Pressable>
          <Pressable
            style={[
              styles.modeBtn,
              viewMode === 'list' && { backgroundColor: paleta.primary },
            ]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'list' ? paleta.onPrimary : paleta.textMuted}
            />
          </Pressable>
        </View>
      </View>

      {/* Aviso amigable si el usuario denegó el GPS */}
      {isPermissionDenied && (
        <View style={[styles.permissionBanner, { backgroundColor: `${paleta.warning}15`, borderColor: paleta.warning }]}>
          <Ionicons name="location-outline" size={20} color={paleta.warning} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <ThemedText variant="caption" color={paleta.text}>
              Ubicación desactivada. Mostrando paradas ordenadas alfabéticamente.
            </ThemedText>
          </View>
          <Pressable onPress={refreshLocation} style={styles.activateBtn}>
            <ThemedText variant="caption" color={paleta.warning} style={{ fontWeight: '700' }}>
              Activar
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Estado: CARGA (Loading State) */}
      {isLoadingData && (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={paleta.primary} />
          <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 12 }}>
            Buscando paradas en Paraná...
          </ThemedText>
        </View>
      )}

      {/* Estado: ERROR (Error State) */}
      {!isLoadingData && errorMessage && (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={paleta.danger} />
          <ThemedText variant="subtitle" style={{ marginTop: 12 }}>
            No pudimos cargar las paradas
          </ThemedText>
          <ThemedText variant="caption" color={paleta.textMuted} style={{ textAlign: 'center', marginTop: 4 }}>
            {errorMessage}
          </ThemedText>
          <Button
            title="Reintentar"
            variant="outline"
            style={{ marginTop: 16 }}
            onPress={loadParadas}
          />
        </View>
      )}

      {/* Estado: VACÍO (Empty State) */}
      {!isLoadingData && !errorMessage && paradas.length === 0 && (
        <View style={styles.centerState}>
          <Ionicons name="bus-outline" size={48} color={paleta.textMuted} />
          <ThemedText variant="subtitle" style={{ marginTop: 12 }}>
            No encontramos ninguna parada
          </ThemedText>
          <ThemedText variant="caption" color={paleta.textMuted} style={{ marginTop: 4 }}>
            Probá buscando por otra calle o limpiá el filtro.
          </ThemedText>
          <Button
            title="Limpiar búsqueda"
            variant="secondary"
            style={{ marginTop: 16 }}
            onPress={() => setSearchQuery('')}
          />
        </View>
      )}

      {/* VISTA MAPA */}
      {!isLoadingData && !errorMessage && paradas.length > 0 && viewMode === 'map' && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: coords?.latitude ?? PARANA_CENTER.latitude,
              longitude: coords?.longitude ?? PARANA_CENTER.longitude,
              latitudeDelta: PARANA_CENTER.latitudeDelta,
              longitudeDelta: PARANA_CENTER.longitudeDelta,
            }}
            showsUserLocation={!!coords}
            showsMyLocationButton={true}
          >
            {/* Círculo de radio aproximado de cercanía a pie si hay GPS */}
            {coords && (
              <Circle
                center={{
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                }}
                radius={400} // 400 metros a pie
                fillColor={`${paleta.primary}20`}
                strokeColor={`${paleta.primary}60`}
                strokeWidth={1.5}
              />
            )}

            {/* Marcadores de paradas */}
            {paradas.map((p) => (
              <Marker
                key={p.id}
                coordinate={{
                  latitude: p.coordenadas.latitud,
                  longitude: p.coordenadas.longitud,
                }}
                title={p.nombre}
                description={`Líneas: ${p.lineaIds.map((l) => l.replace('lin-', 'L')).join(', ')}`}
                onCalloutPress={() => router.push(`/paradas/${p.id}` as any)}
                pinColor={paleta.primary}
              />
            ))}
          </MapView>

          {/* Tarjeta flotante inferior con la parada más cercana */}
          {paradas.length > 0 && (
            <View style={styles.bottomCardContainer}>
              <StopCard parada={paradas[0]} />
            </View>
          )}
        </View>
      )}

      {/* VISTA LISTA */}
      {!isLoadingData && !errorMessage && paradas.length > 0 && viewMode === 'list' && (
        <FlatList
          data={paradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <StopCard parada={item} />}
        />
      )}

      {/* Botón flotante para Escanear Código QR */}
      <Pressable
        style={[styles.qrFab, { backgroundColor: paleta.primary }]}
        onPress={() => router.push('/paradas/escanear-qr')}
      >
        <Ionicons name="qr-code" size={24} color={paleta.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerControls: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  modeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  activateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomCardContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  qrFab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
