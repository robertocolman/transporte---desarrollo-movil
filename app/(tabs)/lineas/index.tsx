import React, { useEffect, useState } from 'react';
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
import { Linea } from '@/types';
import { ThemedText } from '@/components/ThemedText';
import { EstrellaFavorito } from '@/components/EstrellaFavorito';

export default function LineasScreen() {
  const { paleta } = useTheme();
  const router = useRouter();

  const [lineas, setLineas] = useState<Linea[]>([]);
  const [busqueda, setBusqueda] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    async function cargarLineas() {
      setCargando(true);
      const resultado = await linesService.searchLines(busqueda);
      setLineas(resultado);
      setCargando(false);
    }
    cargarLineas();
  }, [busqueda]);

  const renderLinea = ({ item }: { item: Linea }) => {
    const recorridoIda = item.recorridos.find((r) => r.sentido === 'ida');
    const recorridoVuelta = item.recorridos.find((r) => r.sentido === 'vuelta');

    return (
      <Pressable
        style={({ pressed }) => [
          styles.lineCard,
          {
            backgroundColor: paleta.surface,
            borderColor: paleta.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() => router.push(`/lineas/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          {/* Badge con el número y color oficial de la línea */}
          <View style={[styles.badge, { backgroundColor: item.color }]}>
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
            Ver mapa interactivo y paradas
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={paleta.primary} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: paleta.background }]}>
      {/* Barra de Búsqueda */}
      <View style={[styles.searchBox, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
        <Ionicons name="search" size={20} color={paleta.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar por número o destino..."
          placeholderTextColor={paleta.textMuted}
          value={busqueda}
          onChangeText={setBusqueda}
          style={[styles.searchInput, { color: paleta.text }]}
        />
        {busqueda.length > 0 && (
          <Pressable onPress={() => setBusqueda('')}>
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
      ) : (
        <FlatList
          data={lineas}
          keyExtractor={(item) => item.id}
          renderItem={renderLinea}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="bus-outline" size={48} color={paleta.textMuted} />
              <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 12 }}>
                No se encontraron líneas para "{busqueda}".
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
  destinosContainer: {
    marginTop: 14,
    gap: 6,
  },
  destinoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destinoText: {
    fontSize: 13,
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
