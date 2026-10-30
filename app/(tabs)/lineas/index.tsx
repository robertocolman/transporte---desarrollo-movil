import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { linesService } from '@/services/linesService';
import { avisosService } from '@/services/avisosService';
import { Aviso, Linea } from '@/types';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { EstrellaFavorito } from '@/components/EstrellaFavorito';

export default function LineasScreen() {
  const { paleta } = useTheme();
  const router = useRouter();

  const [lineas, setLineas] = useState<Linea[]>([]);
  const [avisosVigentes, setAvisosVigentes] = useState<Aviso[]>([]);
  const [busqueda, setBusqueda] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const cargarLineas = useCallback(
    async (forzarRecarga = false) => {
      try {
        if (forzarRecarga) {
          setRefrescando(true);
        } else {
          setCargando(true);
        }
        setErrorMensaje(null);

        const [resultadoLineas, resultadoAvisos] = await Promise.all([
          linesService.searchLines(busqueda, forzarRecarga),
          avisosService.getAvisos().catch(() => [] as Aviso[]),
        ]);

        setLineas(resultadoLineas);
        setAvisosVigentes(resultadoAvisos);
      } catch (err: any) {
        setErrorMensaje(
          err instanceof Error
            ? err.message
            : 'No pudimos cargar las líneas de colectivos.'
        );
      } finally {
        setCargando(false);
        setRefrescando(false);
      }
    },
    [busqueda]
  );

  useEffect(() => {
    cargarLineas(false);
  }, [cargarLineas]);

  const getAlertaPrincipalDeLinea = (lineaId: string): Aviso | undefined => {
    const deLaLinea = avisosVigentes.filter((a) => a.lineaIds.includes(lineaId));
    return (
      deLaLinea.find((a) => a.gravedad === 'suspension') ||
      deLaLinea.find((a) => a.gravedad === 'desvio') ||
      deLaLinea[0]
    );
  };

  const renderLinea = ({ item }: { item: Linea }) => {
    const recorridoIda = item.recorridos.find((r) => r.sentido === 'ida');
    const recorridoVuelta = item.recorridos.find((r) => r.sentido === 'vuelta');
    const alertaActiva = getAlertaPrincipalDeLinea(item.id);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.lineCard,
          {
            backgroundColor: paleta.surface,
            borderColor:
              alertaActiva?.gravedad === 'suspension'
                ? paleta.danger
                : alertaActiva?.gravedad === 'desvio'
                  ? paleta.warning
                  : paleta.border,
            opacity: pressed ? 0.85 : item.activa ? 1 : 0.72,
          },
        ]}
        onPress={() => router.push(`/lineas/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          {/* Badge con el número y color oficial de la línea */}
          <View
            style={[
              styles.badge,
              { backgroundColor: item.activa ? item.color : paleta.textMuted },
            ]}
          >
            <ThemedText variant="bold" color="#FFFFFF" style={styles.badgeText}>
              L{item.numero}
            </ThemedText>
          </View>

          <View style={styles.headerInfo}>
            <ThemedText variant="subtitle" style={styles.lineName}>
              {item.nombre}
            </ThemedText>
            <ThemedText variant="caption" color={paleta.textMuted}>
              {item.empresa}
            </ThemedText>
          </View>

          <EstrellaFavorito tipo="linea" id={item.id} />
        </View>

        {/* Estado inactivo o alerta/desvío vigente visible directamente en la línea (PRD §1 y §4) */}
        {!item.activa && (
          <View
            style={[
              styles.alertPill,
              { backgroundColor: paleta.surfaceHighlight, borderColor: paleta.border },
            ]}
          >
            <Ionicons name="pause-circle-outline" size={16} color={paleta.textMuted} />
            <ThemedText
              variant="caption"
              color={paleta.textMuted}
              style={styles.alertPillText}
            >
              Línea actualmente sin servicio activo
            </ThemedText>
          </View>
        )}

        {alertaActiva && (
          <View
            style={[
              styles.alertPill,
              alertaActiva.gravedad === 'suspension'
                ? {
                    backgroundColor: `${paleta.danger}15`,
                    borderColor: `${paleta.danger}50`,
                  }
                : alertaActiva.gravedad === 'desvio'
                  ? {
                      backgroundColor: `${paleta.warning}18`,
                      borderColor: `${paleta.warning}60`,
                    }
                  : {
                      backgroundColor: `${paleta.primary}15`,
                      borderColor: `${paleta.primary}40`,
                    },
            ]}
          >
            <Ionicons
              name={
                alertaActiva.gravedad === 'suspension'
                  ? 'alert-circle'
                  : alertaActiva.gravedad === 'desvio'
                    ? 'warning'
                    : 'information-circle'
              }
              size={16}
              color={
                alertaActiva.gravedad === 'suspension'
                  ? paleta.danger
                  : alertaActiva.gravedad === 'desvio'
                    ? paleta.warning
                    : paleta.primary
              }
            />
            <ThemedText
              variant="caption"
              numberOfLines={1}
              color={
                alertaActiva.gravedad === 'suspension'
                  ? paleta.danger
                  : alertaActiva.gravedad === 'desvio'
                    ? paleta.warning
                    : paleta.primary
              }
              style={styles.alertPillText}
            >
              {alertaActiva.gravedad === 'desvio'
                ? `Desvío activo: ${alertaActiva.titulo}`
                : alertaActiva.gravedad === 'suspension'
                  ? `Suspensión: ${alertaActiva.titulo}`
                  : alertaActiva.titulo}
            </ThemedText>
          </View>
        )}

        {/* Indicadores de Recorridos */}
        <View style={styles.destinosContainer}>
          {recorridoIda && (
            <View style={styles.destinoRow}>
              <Ionicons name="arrow-forward-circle" size={16} color={paleta.primary} />
              <ThemedText variant="caption" style={styles.destinoText}>
                {recorridoIda.destino} ({recorridoIda.paradaIds.length} paradas)
              </ThemedText>
            </View>
          )}
          {recorridoVuelta && (
            <View style={styles.destinoRow}>
              <Ionicons name="arrow-back-circle" size={16} color={paleta.accent} />
              <ThemedText variant="caption" style={styles.destinoText}>
                {recorridoVuelta.destino} ({recorridoVuelta.paradaIds.length} paradas)
              </ThemedText>
            </View>
          )}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: paleta.border }]}>
          <ThemedText variant="caption" color={paleta.primary} style={{ fontWeight: '600' }}>
            Ver mapa interactivo, desvíos y paradas
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={paleta.primary} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: paleta.background }]}>
      {/* Barra de Búsqueda */}
      <View
        style={[
          styles.searchBox,
          { backgroundColor: paleta.surface, borderColor: paleta.border },
        ]}
      >
        <Ionicons name="search" size={20} color={paleta.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar por número, destino o empresa..."
          placeholderTextColor={paleta.textMuted}
          value={busqueda}
          onChangeText={setBusqueda}
          style={[styles.searchInput, { color: paleta.text }]}
          returnKeyType="search"
        />
        {busqueda.length > 0 && (
          <Pressable onPress={() => setBusqueda('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={paleta.textMuted} />
          </Pressable>
        )}
      </View>

      {cargando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={paleta.primary} />
          <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 12 }}>
            Cargando líneas urbanas...
          </ThemedText>
        </View>
      ) : errorMensaje ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={paleta.danger} />
          <ThemedText variant="subtitle" style={{ marginTop: 12, textAlign: 'center' }}>
            No pudimos cargar las líneas
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
            onPress={() => cargarLineas(true)}
          />
        </View>
      ) : (
        <FlatList
          data={lineas}
          keyExtractor={(item) => item.id}
          renderItem={renderLinea}
          contentContainerStyle={styles.listContent}
          refreshing={refrescando}
          onRefresh={() => cargarLineas(true)}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="bus-outline" size={48} color={paleta.textMuted} />
              <ThemedText variant="subtitle" style={{ marginTop: 12, textAlign: 'center' }}>
                No encontramos líneas
              </ThemedText>
              <ThemedText
                variant="caption"
                color={paleta.textMuted}
                style={{ marginTop: 6, textAlign: 'center' }}
              >
                {busqueda
                  ? `No hay coincidencias para "${busqueda}".`
                  : 'No hay líneas registradas en este momento.'}
              </ThemedText>
              {busqueda.length > 0 && (
                <Button
                  title="Limpiar búsqueda"
                  variant="secondary"
                  style={{ marginTop: 16 }}
                  onPress={() => setBusqueda('')}
                />
              )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  lineCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 52,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 18,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  lineName: {
    fontSize: 16,
    fontWeight: '700',
  },
  alertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  alertPillText: {
    flex: 1,
    fontWeight: '700',
  },
  destinosContainer: {
    marginTop: 12,
    gap: 6,
  },
  destinoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destinoText: {
    fontSize: 13,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
