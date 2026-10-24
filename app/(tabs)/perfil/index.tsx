import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { authService } from '@/services/authService';
import { useTheme } from '@/hooks/use-theme';

type Usuario = {
  nombre?: string;
  email?: string;
};

export default function PerfilScreen() {
  const { paleta } = useTheme();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [favoritosAbiertos, setFavoritosAbiertos] = useState(false);

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
        <Opcion
          icono="star-outline"
          titulo="Mis favoritos"
          color={paleta.text}
          detalle="Líneas y paradas guardadas"
        />

        <Opcion
          icono="notifications-outline"
          titulo="Notificaciones"
          color={paleta.text}
          detalle="Preferencias de avisos"
        />

        <Opcion
          icono="color-palette-outline"
          titulo="Apariencia"
          color={paleta.text}
          detalle="Tema claro u oscuro"
        />

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
});