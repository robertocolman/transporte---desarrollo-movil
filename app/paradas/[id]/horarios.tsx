import React, { useCallback, useEffect, useState } from 'react';
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
import { formatRelativeSyncAge } from '@/services/localDb';
import { Horario, Linea, Parada, TipoDeDia } from '@/types';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';

export default function HorariosScreen() {
  const { id, lineaId } = useLocalSearchParams<{
    id: string;
    lineaId?: string;
  }>();
  const { paleta } = useTheme();

  const [parada, setParada] = useState<Parada | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [tipoDia, setTipoDia] = useState<TipoDeDia>('habil');
  const [feriadoHoyNombre, setFeriadoHoyNombre] = useState<string | null>(null);
  const [lineaFiltro, setLineaFiltro] = useState<string | null>(
    lineaId ?? null
  );
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [inicializado, setInicializado] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (lineaId) {
      setLineaFiltro(lineaId);
    }
  }, [lineaId]);

  useEffect(() => {
    let montado = true;

    async function inicializar() {
      if (!id) return;
      try {
        setCargando(true);
        setErrorMensaje(null);

        const [p, infoDia] = await Promise.all([
          stopsService.getStopById(id),
          schedulesService.resolverTipoDeDia(),
        ]);

        if (!montado) return;

        setTipoDia(infoDia.tipoDeDia);
        setFeriadoHoyNombre(infoDia.feriadoNombre);

        if (p) {
          setParada(p);
          const lns = await stopsService
            .getLinesForStop(p.lineaIds)
            .catch(() => [] as Linea[]);
          if (montado) setLineas(lns);
        }
      } catch (err: any) {
        if (montado) {
          setErrorMensaje(
            err instanceof Error
              ? err.message
              : 'No pudimos inicializar la pantalla de horarios.'
          );
        }
      } finally {
        if (montado) {
          setInicializado(true);
        }
      }
    }

    void inicializar();

    return () => {
      montado = false;
    };
  }, [id]);

  const cargarHorarios = useCallback(async () => {
    if (!id || !inicializado) return;
    try {
      setCargando(true);
      setErrorMensaje(null);

      const data = await schedulesService.getHorariosPorParada(
        id,
        tipoDia,
        lineaFiltro || undefined
      );
      const syncIso = await schedulesService.getUltimaSincronizacionHorarios();

      setHorarios(data);
      setUltimaSync(syncIso);
    } catch (err: any) {
      setErrorMensaje(
        err instanceof Error
          ? err.message
          : 'No pudimos obtener los horarios programados.'
      );
      setHorarios([]);
    } finally {
      setCargando(false);
    }
  }, [id, inicializado, tipoDia, lineaFiltro]);

  useEffect(() => {
    void cargarHorarios();
  }, [cargarHorarios]);

  const tabsTipoDia: { key: TipoDeDia; label: string }[] = [
    { key: 'habil', label: 'Hábil' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' },
    { key: 'feriado', label: 'Feriado' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: paleta.background }]}>
      {/* Encabezado de la parada */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: paleta.surface, borderColor: paleta.border },
        ]}
      >
        <ThemedText variant="subtitle">
          {parada?.nombre || `Parada ${id}`}
        </ThemedText>
        <ThemedText
          variant="caption"
          color={paleta.textMuted}
          style={{ marginTop: 2 }}
        >
          Tabla oficial de horarios (sin GPS en vivo)
          {ultimaSync ? ` · Datos ${formatRelativeSyncAge(ultimaSync)}` : ''}
        </ThemedText>

        {feriadoHoyNombre && (
          <View
            style={[
              styles.holidayHint,
              {
                backgroundColor: `${paleta.accent}15`,
                borderColor: `${paleta.accent}50`,
              },
            ]}
          >
            <Ionicons name="calendar" size={14} color={paleta.accent} />
            <ThemedText
              variant="caption"
              color={paleta.accent}
              style={{ marginLeft: 6, fontWeight: '700' }}
            >
              Hoy rige tabla de feriado: {feriadoHoyNombre}
            </ThemedText>
          </View>
        )}

        {/* Selector de Tipo de Día */}
        <View
          style={[styles.dayTabs, { backgroundColor: paleta.surfaceHighlight }]}
        >
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
        {lineas.length > 0 && (
          <View style={styles.lineFilterRow}>
            <Pressable
              style={[
                styles.lineFilterBtn,
                !lineaFiltro && { backgroundColor: paleta.primary },
                lineaFiltro
                  ? { borderColor: paleta.border, borderWidth: 1 }
                  : null,
              ]}
              onPress={() => setLineaFiltro(null)}
            >
              <ThemedText
                variant="caption"
                color={!lineaFiltro ? '#FFFFFF' : paleta.text}
                style={{ fontWeight: '700' }}
              >
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
                    seleccionado
                      ? { backgroundColor: l.color }
                      : { borderColor: paleta.border, borderWidth: 1 },
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

      {/* Estados de Carga, Error y Lista/Vacío */}
      {cargando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={paleta.primary} />
          <ThemedText
            variant="body"
            color={paleta.textMuted}
            style={{ marginTop: 12 }}
          >
            Consultando tabla de horarios...
          </ThemedText>
        </View>
      ) : errorMensaje ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={paleta.danger}
          />
          <ThemedText
            variant="subtitle"
            style={{ marginTop: 12, textAlign: 'center' }}
          >
            No pudimos cargar los horarios
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
            onPress={cargarHorarios}
          />
        </View>
      ) : (
        <FlatList
          data={horarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const linea = lineas.find((l) => l.id === item.lineaId);
            const recorrido = linea?.recorridos.find(
              (r) => r.sentido === item.sentido
            );
            const numFallback = item.lineaId.replace(/^lin-0?/, '');

            return (
              <View
                style={[
                  styles.rowItem,
                  {
                    backgroundColor: paleta.surface,
                    borderColor: paleta.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: linea?.color || paleta.primary },
                  ]}
                >
                  <ThemedText variant="bold" color="#FFFFFF">
                    L{linea?.numero || numFallback || '?'}
                  </ThemedText>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText variant="bold">
                    {linea?.nombre || `Línea ${numFallback}`}
                  </ThemedText>
                  <ThemedText variant="caption" color={paleta.textMuted}>
                    {recorrido?.destino ||
                      `Sentido: ${item.sentido.toUpperCase()}`}
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.timeBox,
                    { backgroundColor: paleta.surfaceHighlight },
                  ]}
                >
                  <ThemedText
                    variant="bold"
                    color={paleta.primary}
                    style={{ fontSize: 16 }}
                  >
                    {item.hora} hs
                  </ThemedText>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={paleta.textMuted}
              />
              <ThemedText
                variant="subtitle"
                style={{ marginTop: 12, textAlign: 'center' }}
              >
                Sin horarios para este filtro
              </ThemedText>
              <ThemedText
                variant="caption"
                color={paleta.textMuted}
                style={{ marginTop: 6, textAlign: 'center' }}
              >
                No hay servicios programados en la tabla para el tipo de día y línea seleccionados.
              </ThemedText>
              {lineaFiltro && (
                <Button
                  title="Ver todas las líneas"
                  variant="secondary"
                  style={{ marginTop: 16 }}
                  onPress={() => setLineaFiltro(null)}
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
  headerCard: {
    padding: 16,
    borderBottomWidth: 1,
  },
  holidayHint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
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
    flexWrap: 'wrap',
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
    paddingBottom: 32,
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
