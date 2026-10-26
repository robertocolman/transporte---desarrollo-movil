import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { schedulesService } from '@/services/schedulesService';
import { stopsService } from '@/services/stopsService';
import { linesService } from '@/services/linesService';
import { Horario, Linea, Parada, TipoDeDia } from '@/types';
import { ThemedText } from '@/components/ThemedText';

export default function HorariosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paleta } = useTheme();

  const [parada, setParada] = useState<Parada | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [tipoDia, setTipoDia] = useState<TipoDeDia>('habil');
  const [lineaFiltro, setLineaFiltro] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    async function inicializar() {
      if (!id) return;
      setCargando(true);
      const p = await stopsService.getStopById(id);
      if (p) {
        setParada(p);
        const lns = await stopsService.getLinesForStop(p.lineaIds);
        setLineas(lns);
      }
      setCargando(false);
    }
    inicializar();
  }, [id]);

  useEffect(() => {
    async function cargarHorarios() {
      if (!id) return;
      setCargando(true);
      const data = await schedulesService.getHorariosPorParada(
        id,
        tipoDia,
        lineaFiltro || undefined
      );
      setHorarios(data);
      setCargando(false);
    }
    cargarHorarios();
  }, [id, tipoDia, lineaFiltro]);

  const tabsTipoDia: { key: TipoDeDia; label: string }[] = [
    { key: 'habil', label: 'Hábil' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' },
    { key: 'feriado', label: 'Feriado' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: paleta.background }]}>
      {/* Encabezado de la parada */}
      <View style={[styles.headerCard, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
        <ThemedText variant="subtitle">{parada?.nombre || 'Parada'}</ThemedText>
        <ThemedText variant="caption" color={paleta.textMuted} style={{ marginTop: 2 }}>
          Tabla oficial de horarios y frecuencias programadas
        </ThemedText>

        {/* Selector de Tipo de Día */}
        <View style={[styles.dayTabs, { backgroundColor: paleta.surfaceHighlight }]}>
          {tabsTipoDia.map((t) => (
            <Pressable
              key={t.key}
              style={[
                styles.dayTabBtn,
                tipoDia === t.key && {
                  backgroundColor: paleta.surface,
                  borderColor: paleta.primary,
                  borderWidth: 1,
                },
              ]}
              onPress={() => setTipoDia(t.key)}
            >
              <ThemedText
                variant="bold"
                color={tipoDia === t.key ? paleta.primary : paleta.textMuted}
                style={{ fontSize: 13 }}
              >
                {t.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Filtro por Líneas */}
        {lineas.length > 1 && (
          <View style={styles.lineFilterRow}>
            <Pressable
              style={[
                styles.lineFilterBtn,
                !lineaFiltro && { backgroundColor: paleta.primary },
                lineaFiltro ? { borderColor: paleta.border, borderWidth: 1 } : null,
              ]}
              onPress={() => setLineaFiltro(null)}
            >
              <ThemedText variant="caption" color={!lineaFiltro ? '#FFFFFF' : paleta.text} style={{ fontWeight: '700' }}>
                Todas
              </ThemedText>
            </Pressable>

            {lineas.map((l) => {
              const seleccionado = lineaFiltro === l.id;
              return (
                <Pressable
                  key={l.id}
                  style={[
                    styles.lineFilterBtn,
                    seleccionado ? { backgroundColor: l.color } : { borderColor: paleta.border, borderWidth: 1 },
                  ]}
                  onPress={() => setLineaFiltro(seleccionado ? null : l.id)}
                >
                  <ThemedText
                    variant="caption"
                    color={seleccionado ? '#FFFFFF' : paleta.text}
                    style={{ fontWeight: '700' }}
                  >
                    L{l.numero}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Lista de horarios programados */}
      {cargando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={paleta.primary} />
          <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 12 }}>
            Consultando base local de horarios...
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={horarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const linea = lineas.find((l) => l.id === item.lineaId);

            return (
              <View style={[styles.rowItem, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
                <View style={[styles.badge, { backgroundColor: linea?.color || '#3B82F6' }]}>
                  <ThemedText variant="bold" color="#FFFFFF">
                    L{linea?.numero || '?'}
                  </ThemedText>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText variant="bold">
                    {linea?.nombre || 'Línea de transporte'}
                  </ThemedText>
                  <ThemedText variant="caption" color={paleta.textMuted}>
                    Sentido: {item.sentido.toUpperCase()}
                  </ThemedText>
                </View>

                <View style={[styles.timeBox, { backgroundColor: paleta.surfaceHighlight }]}>
                  <ThemedText variant="bold" color={paleta.primary} style={{ fontSize: 16 }}>
                    {item.hora} hs
                  </ThemedText>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="calendar-outline" size={48} color={paleta.textMuted} />
              <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 12 }}>
                No hay frecuencias registradas para el día y filtro seleccionado.
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
  headerCard: {
    padding: 16,
    borderBottomWidth: 1,
  },
  dayTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginTop: 12,
  },
  dayTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  lineFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  lineFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  badge: {
    width: 44,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
