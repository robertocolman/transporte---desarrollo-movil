import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ThemedText';
import { authService } from '@/services/authService';
import { stopsService } from '@/services/stopsService';
import { linesService } from '@/services/linesService';
import { EstrellaFavorito } from './EstrellaFavorito';

type Favorito = {
  id: string;
  nombre: string;
  tipo: 'parada' | 'linea';
};

export function FavoritosRapidos() {
  const { paleta } = useTheme();
  const router = useRouter();
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarFavoritos() {
        try {
          const token = await authService.getToken();

          if (!token) {
            if (activo) setFavoritos([]);
            return;
          }

          const respuesta = await authService.getCurrentUser();
          const usuario = respuesta.datos;

          const paradas: Favorito[] = await Promise.all(
            (usuario.paradasFavoritas ?? []).map(async (id: string) => {
              const parada = await stopsService.getStopById(id);

              return {
                id,
                nombre: parada?.nombre ?? `Parada ${id.replace(/^par-/, '')}`,
                tipo: 'parada' as const,
              };
            })
          );

          const lineas: Favorito[] = await Promise.all(
            (usuario.lineasFavoritas ?? []).map(async (id: string) => {
              const linea = await linesService.getLineById(id);

              return {
                id,
                nombre: linea
                  ? `Línea ${linea.numero} - ${linea.nombre}`
                  : `Línea ${id.replace(/^lin-/, '')}`,
                tipo: 'linea' as const,
              };
            })
          );

          if (activo) {
            setFavoritos([...paradas, ...lineas]);
          }
        } catch (error) {
          console.error('Error al cargar favoritos:', error);
          if (activo) setFavoritos([]);
        }
      }

      cargarFavoritos();

      return () => {
        activo = false;
      };
    }, [])
  );

  // Si no hay favoritos, no mostramos la sección.
  if (favoritos.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText variant="subtitle">Mis favoritos</ThemedText>
        <ThemedText variant="caption" color={paleta.textMuted}>
          Deslizá →
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsContainer}
      >
        {favoritos.map((favorito) => (
          <Pressable
            key={`${favorito.tipo}-${favorito.id}`}
            onPress={() => {
              if (favorito.tipo === 'parada') {
                router.push(`/paradas/${favorito.id}` as any);
              } else {
                router.push(`/lineas/${favorito.id}` as any);
              }
            }}
            style={[
              styles.card,
              {
                backgroundColor: paleta.surface,
                borderColor: paleta.border,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Ionicons
                name={favorito.tipo === 'parada' ? 'location-outline' : 'bus-outline'}
                size={24}
                color={paleta.primary}
              />

              <EstrellaFavorito
                tipo={favorito.tipo}
                id={favorito.id}
                onFavoritoCambiado={() => {
                  setFavoritos((anteriores) =>
                    anteriores.filter(
                      (item) =>
                        !(item.id === favorito.id && item.tipo === favorito.tipo)
                    )
                  );
                }}
              />
            </View>

            <ThemedText variant="bold" numberOfLines={2}>
              {favorito.nombre}
            </ThemedText>

            <ThemedText variant="caption" color={paleta.textMuted}>
              {favorito.tipo === 'parada' ? 'Parada favorita' : 'Línea favorita'}
            </ThemedText>

            <View style={styles.cardFooter}>
              <ThemedText variant="caption" color={paleta.primary}>
                {favorito.tipo === 'parada' ? 'Ver parada' : 'Ver línea'}
              </ThemedText>
              <Ionicons name="arrow-forward" size={16} color={paleta.primary} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardsContainer: {
    gap: 12,
    paddingRight: 20,
  },
  card: {
    width: 190,
    minHeight: 150,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
