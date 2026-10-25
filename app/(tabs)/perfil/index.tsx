import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/authService';
import { useTheme } from '@/hooks/use-theme';
import { API_URL } from '@/config/api';
import { stopsService } from '@/services/stopsService';

type Usuario = {
  nombre?: string;
  email?: string;
  lineasFavoritas?: string[];
  paradasFavoritas?: string[];
  avisosActivos?: boolean;
};

export default function PerfilScreen() {
  const { paleta, preferenciaTema, setTema } = useTheme();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [favoritosAbiertos, setFavoritosAbiertos] = useState(false);
  const [aparienciaAbierta, setAparienciaAbierta] = useState(false);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [guardandoAvisos, setGuardandoAvisos] = useState(false);
  const [nombresParadas, setNombresParadas] = useState<Record<string, string>>({});

  // Comprobar la sesión cada vez que entramos a "Yo"
  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function comprobarSesion() {
        setCargando(true);

        try {
          const token = await authService.getToken();

          if (!token) {
            if (activo) setUsuario(null);
            return;
          }

          const respuesta = await authService.getCurrentUser();

            if (activo) {
            setUsuario(respuesta.datos);
            }

            const idsParadas = respuesta.datos.paradasFavoritas ?? [];

            const resultados = await Promise.all(
            idsParadas.map(async (id: string) => {
                const parada = await stopsService.getStopById(id);

                return [id, parada?.nombre ?? `Parada ${id.replace(/^par-/, '')}`] as const;
            })
            );

            if (activo) {
            setNombresParadas(Object.fromEntries(resultados));
            }
          
        } catch (error) {
          console.error('Error al consultar la sesión:', error);

          if (activo) {
            setUsuario(null);
          }
        } finally {
          if (activo) {
            setCargando(false);
          }
        }
      }

      comprobarSesion();

      return () => {
        activo = false;
      };
    }, [])
  );
  
  async function cambiarAvisos() {
    if (!usuario || guardandoAvisos) return;

    const nuevoValor = !usuario.avisosActivos;

    setGuardandoAvisos(true);

    try {
      const token = await authService.getToken();

      if (!token) {
        Alert.alert('Error', 'Tenés que iniciar sesión.');
        return;
      }

      const respuesta = await fetch(`${API_URL}/yo`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avisosActivos: nuevoValor,
        }),
      });

      if (!respuesta.ok) {
        throw new Error('No se pudo actualizar la preferencia.');
      }

      const usuarioActualizado = await authService.getCurrentUser();
      setUsuario(usuarioActualizado.datos);
    } catch (error) {
      console.error('Error al guardar los avisos:', error);
      Alert.alert('Error', 'No se pudo guardar la preferencia de notificaciones.');
    } finally {
      setGuardandoAvisos(false);
    }
  }

  // Cerrar sesión
  async function cerrarSesion() {
    try {
      await authService.removeToken();
      setUsuario(null);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
    }
  }

  // Mientras se comprueba la sesión
  if (cargando) {
    return (
      <View
        style={[
          styles.centrado,
          { backgroundColor: paleta.background },
        ]}
      >
        <ActivityIndicator size="large" color={paleta.primary} />
        <Text style={{ color: paleta.text, marginTop: 12 }}>
          Cargando perfil...
        </Text>
      </View>
    );
  }

  // Si NO inició sesión
  if (!usuario) {
    return (
      <View
        style={[
          styles.centrado,
          { backgroundColor: paleta.background },
        ]}
      >
        <View
          style={[
            styles.avatarGrande,
            { backgroundColor: paleta.surfaceHighlight },
          ]}
        >
          <Ionicons
            name="person-outline"
            size={55}
            color={paleta.primary}
          />
        </View>

        <Text style={[styles.titulo, { color: paleta.text }]}>
          Mi perfil
        </Text>

        <Text
          style={[
            styles.descripcion,
            { color: paleta.textMuted },
          ]}
        >
          Iniciá sesión para guardar tus líneas y paradas
          favoritas y personalizar tu experiencia.
        </Text>

        <Pressable
          style={[
            styles.botonPrincipal,
            { backgroundColor: paleta.primary },
          ]}
          onPress={() => router.push('/login')}
        >
          <Text style={[styles.textoBoton, { color: paleta.onPrimary }]}>
            Iniciar sesión
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push('/register')}>
          <Text style={[styles.registro, { color: paleta.accent }]}>
            ¿No tenés cuenta? Registrate
          </Text>
        </Pressable>
      </View>
    );
  }

  // Si SÍ inició sesión
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: paleta.background }}
      contentContainerStyle={styles.contenido}
    >
      <Text style={[styles.titulo, { color: paleta.text }]}>
        Mi perfil
      </Text>

      {/* Tarjeta con datos del usuario */}
      <View
        style={[
          styles.tarjeta,
          {
            backgroundColor: paleta.surface,
            borderColor: paleta.border,
          },
        ]}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: paleta.surfaceHighlight },
          ]}
        >
          <Ionicons
            name="person-outline"
            size={28}
            color={paleta.primary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.nombre, { color: paleta.text }]}>
            {usuario.nombre || 'Mi cuenta'}
          </Text>

          <Text style={{ color: paleta.textMuted }}>
            {usuario.email || ''}
          </Text>
        </View>
      </View>

      <Text style={[styles.seccion, { color: paleta.textMuted }]}>
        Mis opciones
      </Text>

      {/* Opciones del perfil */}
      <View
        style={[
          styles.tarjetaOpciones,
          {
            backgroundColor: paleta.surface,
            borderColor: paleta.border,
          },
        ]}
      >
        {/* Favoritos desplegables */}
        <Pressable
        style={styles.opcion}
        onPress={() => setFavoritosAbiertos(!favoritosAbiertos)}
        >
        <Ionicons
            name="star-outline"
            size={23}
            color={paleta.text}
        />

        <View style={{ flex: 1 }}>
            <Text
            style={{
                color: paleta.text,
                fontSize: 15,
                fontWeight: '600',
            }}
            >
            Mis favoritos
            </Text>

            <Text
            style={{
                color: paleta.textMuted,
                fontSize: 12,
            }}
            >
            Líneas y paradas guardadas
            </Text>
        </View>

        <Ionicons
            name={favoritosAbiertos ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={paleta.textMuted}
        />
        </Pressable>

        {favoritosAbiertos && (
        <View style={styles.contenidoFavoritos}>
            <View style={styles.subtituloFavoritos}>
            <Ionicons
                name="bus-outline"
                size={20}
                color={paleta.primary}
            />

            <Text style={{ color: paleta.text, fontWeight: '600' }}>
                Líneas favoritas
            </Text>
            </View>

            <View style={{ marginBottom: 18 }}>
                {usuario.lineasFavoritas?.length ? (
                    usuario.lineasFavoritas.map((lineaId) => (
                    <View
                        key={lineaId}
                        style={styles.favorito}
                    >
                        <Text style={{ color: paleta.text, flex: 1, fontWeight: '500' }}>
                            {`Línea ${lineaId.replace(/^lin-/, '')}`}
                        </Text>

                        <Pressable
                            onPress={() => quitarLineaFavorita(lineaId)}
                            hitSlop={10}
                        >
                            <Ionicons
                                name="star"
                                size={16}
                                color={paleta.accent}
                            />
                        </Pressable>
                    </View>
                    ))
                ) : (
                    <Text style={{ color: paleta.textMuted }}>
                    Todavía no tenés líneas favoritas.
                    </Text>
                )}
                </View>

            <View style={styles.subtituloFavoritos}>
            <Ionicons
                name="location-outline"
                size={20}
                color={paleta.primary}
            />

            <Text style={{ color: paleta.text, fontWeight: '600' }}>
                Paradas favoritas
            </Text>
            </View>

            <View>
                {usuario.paradasFavoritas?.length ? (
                    usuario.paradasFavoritas.map((paradaId) => (
                    <View
                        key={paradaId}
                        style={styles.favorito}
                    >
                        <Text style={{ color: paleta.text, flex: 1, fontWeight: '500' }}>
                            {nombresParadas[paradaId] ?? `Parada ${paradaId.replace(/^par-/, '')}`}
                        </Text>

                        <Pressable
                            onPress={() => quitarParadaFavorita(paradaId)}
                            hitSlop={10}
                        >
                            <Ionicons
                                name="star"
                                size={16}
                                color={paleta.accent}
                            />
                        </Pressable>
                    </View>
                    ))
                ) : (
                    <Text style={{ color: paleta.textMuted }}>
                    Todavía no tenés paradas favoritas.
                    </Text>
                )}
            </View>
        </View>
        )}

        
        {/* Notificaciones desplegables */}
        <Pressable
          style={styles.opcion}
          onPress={() => setNotificacionesAbiertas(!notificacionesAbiertas)}
        >
          <Ionicons
            name="notifications-outline"
            size={23}
            color={paleta.text}
          />

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: paleta.text,
                fontSize: 15,
                fontWeight: '600',
              }}
            >
              Notificaciones
            </Text>

            <Text
              style={{
                color: paleta.textMuted,
                fontSize: 12,
              }}
            >
              Preferencias de avisos
            </Text>
          </View>

          <Ionicons
            name={notificacionesAbiertas ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={paleta.textMuted}
          />
        </Pressable>

        {notificacionesAbiertas && (
          <View
            style={{
              paddingLeft: 37,
              paddingRight: 10,
              paddingBottom: 15,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: paleta.text,
                    fontSize: 14,
                    fontWeight: '500',
                  }}
                >
                  Recibir avisos
                </Text>

                <Text
                  style={{
                    color: paleta.textMuted,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Activar o desactivar los avisos del transporte
                </Text>
              </View>

              <Switch
                value={usuario.avisosActivos ?? false}
                onValueChange={cambiarAvisos}
                disabled={guardandoAvisos}
                trackColor={{
                  false: paleta.border,
                  true: paleta.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            {guardandoAvisos && (
              <ActivityIndicator
                size="small"
                color={paleta.primary}
              />
            )}
          </View>
        )}

        
        {/* Apariencia desplegable */}
        <Pressable
        style={styles.opcion}
        onPress={() => setAparienciaAbierta(!aparienciaAbierta)}
        >
        <Ionicons
            name="color-palette-outline"
            size={23}
            color={paleta.text}
        />

        <View style={{ flex: 1 }}>
            <Text style={{ color: paleta.text, fontSize: 15, fontWeight: '600' }}>
            Apariencia
            </Text>

            <Text style={{ color: paleta.textMuted, fontSize: 12 }}>
            Tema claro, oscuro o automático
            </Text>
        </View>

        <Ionicons
            name={aparienciaAbierta ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={paleta.textMuted}
        />
        </Pressable>

        
        {aparienciaAbierta && (
        <View style={{ paddingLeft: 37, paddingBottom: 15 }}>

            {/* Tema claro */}
            <Pressable
            style={styles.opcion}
            onPress={() => setTema('light')}
            >
            <Ionicons
                name="sunny-outline"
                size={21}
                color={paleta.text}
            />

            <Text style={{ color: paleta.text, flex: 1 }}>
                Tema claro
            </Text>

            {preferenciaTema === 'light' && (
                <Ionicons
                name="checkmark-circle"
                size={22}
                color={paleta.primary}
                />
            )}
            </Pressable>

            {/* Tema oscuro */}
            <Pressable
            style={styles.opcion}
            onPress={() => setTema('dark')}
            >
            <Ionicons
                name="moon-outline"
                size={21}
                color={paleta.text}
            />

            <Text style={{ color: paleta.text, flex: 1 }}>
                Tema oscuro
            </Text>

            {preferenciaTema === 'dark' && (
                <Ionicons
                name="checkmark-circle"
                size={22}
                color={paleta.primary}
                />
            )}
            </Pressable>

            {/* Tema del sistema */}
            <Pressable
            style={styles.opcion}
            onPress={() => setTema('system')}
            >
            <Ionicons
                name="phone-portrait-outline"
                size={21}
                color={paleta.text}
            />

            <Text style={{ color: paleta.text, flex: 1 }}>
                Tema del sistema
            </Text>

            {preferenciaTema === 'system' && (
                <Ionicons
                name="checkmark-circle"
                size={22}
                color={paleta.primary}
                />
            )}
            </Pressable>

        </View>
        )}


        <Opcion
          icono="finger-print-outline"
          titulo="Acceso biométrico"
          color={paleta.text}
          detalle="Huella o reconocimiento compatible"
        />
      </View>

      <Pressable
        style={[styles.botonSalir, { borderColor: paleta.danger }]}
        onPress={cerrarSesion}
      >
        <Ionicons name="log-out-outline" size={20} color={paleta.danger} />
        <Text style={{ color: paleta.danger, fontWeight: 'bold' }}>
          Cerrar sesión
        </Text>
      </Pressable>
    </ScrollView>
  );

    function quitarParadaFavorita(paradaId: string) {
    Alert.alert(
        'Quitar de favoritos',
        '¿Querés quitar esta parada de tus favoritos?',
        [
        { text: 'Cancelar', style: 'cancel' },
        {
            text: 'Quitar',
            style: 'destructive',
            onPress: async () => {
            try {
                const token = await authService.getToken();

                if (!token) {
                Alert.alert('Error', 'Tenés que iniciar sesión.');
                return;
                }

                const respuesta = await fetch(
                `${API_URL}/yo/paradas-favoritas/${encodeURIComponent(paradaId)}`,
                {
                    method: 'DELETE',
                    headers: {
                    Authorization: `Bearer ${token}`,
                    },
                }
                );

                if (!respuesta.ok) {
                throw new Error('No se pudo quitar la parada.');
                }

                const usuarioActualizado = await authService.getCurrentUser();
                setUsuario(usuarioActualizado.datos);
            } catch (error) {
                Alert.alert('Error', 'No se pudo quitar la parada de favoritos.');
            }
            },
        },
        ]
    );
    }
    function quitarLineaFavorita(lineaId: string) {
        Alert.alert(
            'Quitar de favoritos',
            '¿Querés quitar esta línea de tus favoritos?',
            [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Quitar',
                style: 'destructive',
                onPress: async () => {
                try {
                    const token = await authService.getToken();

                    if (!token) {
                    Alert.alert('Error', 'Tenés que iniciar sesión.');
                    return;
                    }

                    const respuesta = await fetch(
                    `${API_URL}/yo/lineas-favoritas/${encodeURIComponent(lineaId)}`,
                    {
                        method: 'DELETE',
                        headers: {
                        Authorization: `Bearer ${token}`,
                        },
                    }
                    );

                    if (!respuesta.ok) {
                    throw new Error('No se pudo quitar la línea.');
                    }

                    const usuarioActualizado = await authService.getCurrentUser();
                    setUsuario(usuarioActualizado.datos);
                } catch (error) {
                    Alert.alert('Error', 'No se pudo quitar la línea de favoritos.');
                }
                },
            },
            ]
        );
    }
}
// Componente visual reutilizable para las opciones
function Opcion({
  icono,
  titulo,
  detalle,
  color,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  detalle: string;
  color: string;
}) {
  return (
    <View style={styles.opcion}>
      <Ionicons name={icono} size={23} color={color} />

      <View style={{ flex: 1 }}>
        <Text style={{ color, fontSize: 15, fontWeight: '600' }}>
          {titulo}
        </Text>
        <Text style={{ color, opacity: 0.65, fontSize: 12 }}>
          {detalle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  avatarGrande: {
    width: 105,
    height: 105,
    borderRadius: 53,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  descripcion: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  botonPrincipal: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  textoBoton: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  registro: {
    marginTop: 22,
    fontSize: 15,
    fontWeight: '600',
  },
  contenido: {
    padding: 22,
    paddingBottom: 40,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 28,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nombre: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  seccion: {
    fontSize: 13,
    marginBottom: 12,
  },
  tarjetaOpciones: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 17,
  },
  botonSalir: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginTop: 32,
  },
  contenidoFavoritos: {
    paddingLeft: 37,
    paddingRight: 10,
    paddingBottom: 20,
  },

  subtituloFavoritos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  favorito: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 10,
  },
});