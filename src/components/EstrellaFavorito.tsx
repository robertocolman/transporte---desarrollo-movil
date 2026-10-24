import React, { useCallback, useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/hooks/use-theme';
import { authService } from '@/services/authService';
import { API_URL } from '@/config/api';

interface Props {
  id: string;
  tipo: 'parada' | 'linea';
  onFavoritoCambiado?: () => void;
}

export function EstrellaFavorito({
  id,
  tipo,
  onFavoritoCambiado,
}: Props) {
  const { paleta } = useTheme();
  const router = useRouter();

  const [esFavorita, setEsFavorita] = useState(false);
  const [cargando, setCargando] = useState(false);

  const comprobarFavorito = useCallback(async () => {
    try {
      const token = await authService.getToken();

      if (!token) {
        setEsFavorita(false);
        return;
      }

      const respuesta = await authService.getCurrentUser();

      setEsFavorita(
        (tipo === 'parada'
  ? respuesta.datos.paradasFavoritas
  : respuesta.datos.lineasFavoritas
)?.includes(id) ?? false
      );
    } catch (error) {
      console.error('Error al consultar favoritos:', error);
    }
  }, [id, tipo]);

  useFocusEffect(
    useCallback(() => {
      comprobarFavorito();
    }, [comprobarFavorito])
  );

  async function cambiarFavorito() {
    if (cargando) return;

    const token = await authService.getToken();

    if (!token) {
      Alert.alert(
        'Iniciar sesión',
        'Para guardar paradas favoritas necesitás iniciar sesión.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar sesión',
            onPress: () => router.push('/login' as any),
          },
        ]
      );
      return;
    }

    setCargando(true);

    try {
      const metodo = esFavorita ? 'DELETE' : 'PUT';

      const respuesta = await fetch(
        `${API_URL}/yo/${tipo === 'parada' ? 'paradas' : 'lineas'}-favoritas/${encodeURIComponent(id)}`,
        {
          method: metodo,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!respuesta.ok) {
        throw new Error('No se pudo actualizar el favorito.');
      }

      setEsFavorita(!esFavorita);
      onFavoritoCambiado?.();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar favorito.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Pressable
      onPress={cambiarFavorito}
      disabled={cargando}
      hitSlop={10}
      style={{ padding: 4 }}
    >
      <Ionicons
        name={esFavorita ? 'star' : 'star-outline'}
        size={22}
        color={esFavorita ? paleta.accent : paleta.textMuted}
      />
    </Pressable>
  );
}