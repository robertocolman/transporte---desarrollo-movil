import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/useUserLocation';
import {
  calculateBearing,
  calculateDistanceMeters,
  stopsService,
} from '@/services/stopsService';
import { Linea, Parada } from '@/types';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { CompassArrow } from '@/components/CompassArrow';
import { EstrellaFavorito } from '@/components/EstrellaFavorito';
import { StopReportsList } from '../../src/components/StopReportsList';

export default function ParadaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paleta } = useTheme();
  const router = useRouter();
  const { coords } = useUserLocation();

  const [parada, setParada] = useState<Parada | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDetail() {
      if (!id) return;
      setIsLoading(true);
      const data = await stopsService.getStopById(id);
      if (data) {
        setParada(data);
        const lns = await stopsService.getLinesForStop(data.lineaIds);
        setLineas(lns);
      }
      setIsLoading(false);
    }
    loadDetail();
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.centerState, { backgroundColor: paleta.background }]}>
        <ActivityIndicator size="large" color={paleta.primary} />
        <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 12 }}>
          Cargando parada...
        </ThemedText>
      </View>
    );
  }

  if (!parada) {
    return (
      <View style={[styles.centerState, { backgroundColor: paleta.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={paleta.danger} />
        <ThemedText variant="subtitle" style={{ marginTop: 12 }}>
          Parada no encontrada
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

  // Cálculo en vivo de distancia y rumbo si tenemos GPS del usuario
  const distanciaMetros = coords
    ? calculateDistanceMeters(
        coords.latitude,
        coords.longitude,
        parada.coordenadas.latitud,
        parada.coordenadas.longitud
      )
    : undefined;

  const bearing = coords
    ? calculateBearing(
        coords.latitude,
        coords.longitude,
        parada.coordenadas.latitud,
        parada.coordenadas.longitud
      )
    : 0;

  // Acción para abrir la app nativa de mapas del celular (Google Maps / Apple Maps)
  const openExternalMaps = () => {
    const lat = parada.coordenadas.latitud;
    const lon = parada.coordenadas.longitud;
    const label = encodeURIComponent(parada.nombre);

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'No se pudo abrir la aplicación de mapas externa.');
      });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: paleta.background }]} contentContainerStyle={styles.content}>
      {/* Cabecera de la parada */}
      <View style={[styles.card, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.iconBox, { backgroundColor: `${paleta.primary}15` }]}>
            <Ionicons name="bus" size={28} color={paleta.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText variant="title">{parada.nombre}</ThemedText>

            <ThemedText
              variant="caption"
              color={paleta.textMuted}
              style={{ marginTop: 2 }}
            >
              ID: {parada.id} · Sentido: {parada.sentido.toUpperCase()}
            </ThemedText>
          </View>

          <EstrellaFavorito tipo="parada" id={parada.id} />
        </View>

        {/* Garita y Código QR */}
        <View style={styles.tagsRow}>
          {parada.refugio ? (
            <View style={[styles.tag, { backgroundColor: `${paleta.success}20` }]}>
              <Ionicons name="shield-checkmark" size={14} color={paleta.success} />
              <ThemedText variant="caption" color={paleta.success} style={styles.tagText}>
                Parada con garita / refugio
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.tag, { backgroundColor: paleta.surfaceHighlight }]}>
              <Ionicons name="information-circle-outline" size={14} color={paleta.textMuted} />
              <ThemedText variant="caption" color={paleta.textMuted} style={styles.tagText}>
                Parada sin refugio (poste señalizado)
              </ThemedText>
            </View>
          )}

          {parada.codigoQr && (
            <View style={[styles.tag, { backgroundColor: `${paleta.accent}15` }]}>
              <Ionicons name="qr-code" size={14} color={paleta.accent} />
              <ThemedText variant="caption" color={paleta.accent} style={styles.tagText}>
                {parada.codigoQr}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* COMPONENTE BRÚJULA Y ORIENTACIÓN A PIE */}
      <CompassArrow
        targetBearing={bearing}
        distanciaMetros={distanciaMetros}
        nombreParada={parada.nombre}
      />

      {/* Botón para navegar caminando con la app de mapas externa */}
      <Button
        title="🗺️ Abrir en Google Maps / Apple Maps"
        variant="primary"
        style={styles.actionButton}
        onPress={openExternalMaps}
      />

      {/* Líneas que pasan por esta parada */}
      <View style={[styles.card, { backgroundColor: paleta.surface, borderColor: paleta.border, marginTop: 12 }]}>
        <ThemedText variant="subtitle" style={styles.sectionHeader}>
          Líneas que operan en esta parada ({lineas.length})
        </ThemedText>

        <View style={styles.linesList}>
          {lineas.map((linea) => (
            <View key={linea.id} style={[styles.lineItem, { borderColor: paleta.border }]}>
              <View style={[styles.lineBadge, { backgroundColor: linea.color }]}>
                <ThemedText variant="bold" color="#fff">
                  L{linea.numero}
                </ThemedText>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText variant="bold">{linea.nombre}</ThemedText>
                <ThemedText variant="caption" color={paleta.textMuted}>
                  {linea.empresa}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Acciones del servicio */}
      <View style={[styles.card, { backgroundColor: paleta.surfaceHighlight, borderColor: paleta.border, marginTop: 12 }]}>
        <ThemedText variant="bold" color={paleta.text}>
          Servicios de la Parada:
        </ThemedText>
        <ThemedText variant="caption" color={paleta.textMuted} style={{ marginTop: 4 }}>
          Consultá los horarios programados o notificá una demora en el servicio:
        </ThemedText>

        <View style={{ marginTop: 12, gap: 8 }}>
          <Button
            title="⏱️ Ver Horarios y Próximos Arribos"
            variant="outline"
            onPress={() => Alert.alert('Próximos Arribos', 'Consultando el motor de frecuencias horarias.')}
          />
          <Button
            title="📢 Reportar Colectivo Demorado"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/paradas/[id]/reportar',
                params: { id: parada.id },
              })
            }
          />
        </View>
      </View>
      {/* Reportes comunitarios de esta parada */}
      <StopReportsList paradaId={parada.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    marginLeft: 6,
    fontWeight: '600',
  },
  actionButton: {
    marginVertical: 4,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  linesList: {
    gap: 10,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineBadge: {
    width: 44,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
