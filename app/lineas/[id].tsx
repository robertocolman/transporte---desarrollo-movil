import React, { useCallback, useEffect, useState } from 'react';
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
import { avisosService } from '@/services/avisosService';
import { Aviso, Linea, Parada, Sentido } from '@/types';
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
  const [avisosLinea, setAvisosLinea] = useState<Aviso[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const cargarDetalle = useCallback(async () => {
    if (!id) return;
    try {
      setCargando(true);
      setErrorMensaje(null);

      const data = await linesService.getLineById(id);
      if (!data) {
        setLinea(null);
        return;
      }

      setLinea(data);
      if (
        data.recorridos.length > 0 &&
        !data.recorridos.some((r) => r.sentido === 'ida')
      ) {
        setSentido(data.recorridos[0].sentido);
      }

      const [todasLasParadas, avisos] = await Promise.all([
        stopsService.getAllStops(),
        avisosService.getAvisosByLinea(id).catch(() => [] as Aviso[]),
      ]);

      setParadas(todasLasParadas);
      setAvisosLinea(avisos);
    } catch (err: any) {
      setErrorMensaje(
        err instanceof Error
          ? err.message
          : 'No pudimos cargar el recorrido de la línea.'
      );
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

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

  if (errorMensaje) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: paleta.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={paleta.danger} />
        <ThemedText variant="subtitle" style={{ marginTop: 12, textAlign: 'center' }}>
          No pudimos obtener el recorrido
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
          variant="primary"
          style={{ marginTop: 16, minWidth: 160 }}
          onPress={cargarDetalle}
        />
        <Button
          title="Volver"
          variant="outline"
          style={{ marginTop: 10, minWidth: 160 }}
          onPress={() => router.back()}
        />
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

  // Mapeo de paradas en el orden exacto del recorrido (Regla R3)
  const paradasDelRecorrido: Parada[] = (recorridoActual?.paradaIds || [])
    .map((paradaId) => paradas.find((p) => p.id === paradaId))
    .filter((p): p is Parada => Boolean(p));

  // Coordenadas para Polyline del sentido seleccionado y sentido opuesto
  const trazadoActualCoords = (recorridoActual?.trazado || []).map((c) => ({
    latitude: c.latitud,
    longitude: c.longitud,
  }));

  const trazadoOpuestoCoords = (recorridoOpuesto?.trazado || []).map((c) => ({
    latitude: c.latitud,
    longitude: c.longitud,
  }));

  // Trazados alternativos de desvíos activos sobre esta línea (PRD §4)
  const trazadosDesvio = avisosLinea
    .filter(
      (a) =>
        Array.isArray(a.trazadoAlternativo) && a.trazadoAlternativo.length >= 2
    )
    .map((a) => ({
      id: a.id,
      titulo: a.titulo,
      coords: (a.trazadoAlternativo || []).map((c) => ({
        latitude: c.latitud,
        longitude: c.longitud,
      })),
    }));

  const puntoInicial =
    trazadosDesvio[0]?.coords[0] ||
    trazadoActualCoords[0] || {
      latitude: -31.7333,
      longitude: -60.5297,
    };

  const centroRegion = {
    latitude: puntoInicial.latitude,
    longitude: puntoInicial.longitude,
    latitudeDelta: 0.055,
    longitudeDelta: 0.055,
  };

  const primeraParadaId = paradasDelRecorrido[0]?.id;

  return (
    <View style={[styles.container, { backgroundColor: paleta.background }]}>
      <FlatList
        data={paradasDelRecorrido}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.stopsListContent}
        ListHeaderComponent={
          <View>
            {/* Cabecera con info de la línea */}
            <View
              style={[
                styles.headerCard,
                { backgroundColor: paleta.surface, borderColor: paleta.border },
              ]}
            >
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: linea.activa ? linea.color : paleta.textMuted },
                  ]}
                >
                  <ThemedText variant="bold" color="#FFFFFF" style={{ fontSize: 18 }}>
                    L{linea.numero}
                  </ThemedText>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText variant="subtitle">{linea.nombre}</ThemedText>
                  <ThemedText variant="caption" color={paleta.textMuted}>
                    {linea.empresa}
                    {!linea.activa ? ' · Fuera de servicio' : ''}
                  </ThemedText>
                </View>
                <EstrellaFavorito tipo="linea" id={linea.id} />
              </View>

              {/* Avisos/desvíos activos visibles directamente al consultar la línea */}
              {avisosLinea.map((aviso) => {
                const esSuspension = aviso.gravedad === 'suspension';
                const esDesvio = aviso.gravedad === 'desvio';
                const colorAlerta = esSuspension
                  ? paleta.danger
                  : esDesvio
                    ? paleta.warning
                    : paleta.primary;

                return (
                  <Pressable
                    key={aviso.id}
                    onPress={() => router.push('/avisos')}
                    style={[
                      styles.avisoBanner,
                      {
                        backgroundColor: `${colorAlerta}15`,
                        borderColor: `${colorAlerta}55`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        esSuspension
                          ? 'alert-circle'
                          : esDesvio
                            ? 'warning'
                            : 'information-circle'
                      }
                      size={20}
                      color={colorAlerta}
                      style={{ marginTop: 2 }}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <ThemedText variant="bold" color={colorAlerta} style={{ fontSize: 13 }}>
                        {esSuspension
                          ? `Suspensión: ${aviso.titulo}`
                          : esDesvio
                            ? `Desvío vigente: ${aviso.titulo}`
                            : aviso.titulo}
                      </ThemedText>
                      <ThemedText
                        variant="caption"
                        color={paleta.text}
                        numberOfLines={2}
                        style={{ marginTop: 2 }}
                      >
                        {aviso.detalle}
                      </ThemedText>
                      <ThemedText
                        variant="caption"
                        color={colorAlerta}
                        style={{ marginTop: 4, fontWeight: '700' }}
                      >
                        {aviso.trazadoAlternativo
                          ? 'Trazado alternativo marcado en naranja en el mapa · Ver cartelera →'
                          : 'Ver detalle completo en avisos →'}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}

              {/* Selector de Sentido (Ida / Vuelta) */}
              <View style={[styles.tabsRow, { backgroundColor: paleta.surfaceHighlight }]}>
                <Pressable
                  style={[
                    styles.tabBtn,
                    sentido === 'ida' && {
                      backgroundColor: paleta.surface,
                      borderColor: paleta.primary,
                      borderWidth: 1,
                    },
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
                    sentido === 'vuelta' && {
                      backgroundColor: paleta.surface,
                      borderColor: paleta.primary,
                      borderWidth: 1,
                    },
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
                Destino actual:{' '}
                <ThemedText variant="bold">
                  {recorridoActual?.destino || 'Circuito general'}
                </ThemedText>
              </ThemedText>
            </View>

            {/* Mapa interactivo con Polyline habitual, desvío alternativo y paradas */}
            <View style={styles.mapContainer}>
              <MapView
                key={`${linea.id}-${sentido}`}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={centroRegion}
              >
                {/* Trazado del sentido opuesto (línea tenue secundaria) */}
                {trazadoOpuestoCoords.length > 1 && (
                  <Polyline
                    coordinates={trazadoOpuestoCoords}
                    strokeColor="#94A3B8"
                    strokeWidth={3}
                    lineDashPattern={[6, 4]}
                  />
                )}

                {/* Trazado habitual del sentido activo */}
                {trazadoActualCoords.length > 1 && (
                  <Polyline
                    coordinates={trazadoActualCoords}
                    strokeColor={linea.color}
                    strokeWidth={5}
                  />
                )}

                {/* Trazado alternativo si hay desvío vigente */}
                {trazadosDesvio.map((desvio) => (
                  <Polyline
                    key={`desvio-${desvio.id}`}
                    coordinates={desvio.coords}
                    strokeColor="#F97316"
                    strokeWidth={5}
                    lineDashPattern={[10, 6]}
                  />
                ))}

                {/* Marcadores de paradas del sentido actual */}
                {paradasDelRecorrido.map((parada, index) => (
                  <Marker
                    key={`${parada.id}-${index}`}
                    coordinate={{
                      latitude: parada.coordenadas.latitud,
                      longitude: parada.coordenadas.longitud,
                    }}
                    title={`${index + 1}. ${parada.nombre}`}
                    description={
                      parada.refugio ? 'Con garita / refugio' : 'Poste señalizado'
                    }
                    pinColor={linea.color}
                    onCalloutPress={() =>
                      router.push(`/paradas/${parada.id}` as any)
                    }
                  />
                ))}
              </MapView>

              {trazadosDesvio.length > 0 && (
                <View
                  style={[
                    styles.mapLegend,
                    { backgroundColor: paleta.surface, borderColor: paleta.border },
                  ]}
                >
                  <View style={styles.legendRow}>
                    <View
                      style={[styles.legendSwatch, { backgroundColor: linea.color }]}
                    />
                    <ThemedText variant="caption">Habitual</ThemedText>
                  </View>
                  <View style={styles.legendRow}>
                    <View
                      style={[styles.legendSwatch, { backgroundColor: '#F97316' }]}
                    />
                    <ThemedText variant="caption" style={{ fontWeight: '700' }}>
                      Desvío activo
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>

            {/* Encabezado de paradas y acceso a horarios de la línea */}
            <View
              style={[
                styles.stopsHeader,
                {
                  backgroundColor: paleta.surface,
                  borderTopColor: paleta.border,
                  borderBottomColor: paleta.border,
                },
              ]}
            >
              <View>
                <ThemedText variant="bold">
                  Paradas de {sentido === 'ida' ? 'Ida' : 'Vuelta'} (
                  {paradasDelRecorrido.length})
                </ThemedText>
                <ThemedText variant="caption" color={paleta.textMuted}>
                  En orden de paso · Tocá una parada para ver sus arribos
                </ThemedText>
              </View>

              {primeraParadaId && (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/paradas/[id]/horarios',
                      params: { id: primeraParadaId, lineaId: linea.id },
                    })
                  }
                  style={[
                    styles.scheduleBtn,
                    { backgroundColor: `${paleta.primary}15` },
                  ]}
                >
                  <Ionicons name="time-outline" size={15} color={paleta.primary} />
                  <ThemedText
                    variant="caption"
                    color={paleta.primary}
                    style={{ fontWeight: '700', marginLeft: 4 }}
                  >
                    Horarios
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        }
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
            <View
              style={[styles.orderIndex, { backgroundColor: `${linea.color}20` }]}
            >
              <ThemedText variant="bold" color={linea.color}>
                {index + 1}
              </ThemedText>
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText variant="bold">{item.nombre}</ThemedText>
              <ThemedText variant="caption" color={paleta.textMuted}>
                {item.refugio ? 'Garita / Refugio' : 'Poste'} ·{' '}
                {item.codigoQr || 'Sin QR'}
              </ThemedText>
            </View>

            <Pressable
              hitSlop={8}
              onPress={() =>
                router.push({
                  pathname: '/paradas/[id]/horarios',
                  params: { id: item.id, lineaId: linea.id },
                })
              }
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Ionicons name="time-outline" size={18} color={paleta.primary} />
            </Pressable>

            <Ionicons name="chevron-forward" size={16} color={paleta.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyStops}>
            <ThemedText variant="caption" color={paleta.textMuted}>
              No hay paradas cargadas para este sentido del recorrido.
            </ThemedText>
          </View>
        }
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
  avisoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
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
    height: 250,
    width: '100%',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  mapLegend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 4,
    borderRadius: 2,
  },
  stopsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stopsListContent: {
    paddingBottom: 24,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
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
  emptyStops: {
    padding: 24,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
