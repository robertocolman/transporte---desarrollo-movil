
// FORMULARIO DE REPORTES

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../../../src/components/ThemedText';
import { useTheme } from '../../../src/hooks/use-theme';
import { stopsService } from '../../../src/services/stopsService';
import { guardarFotoReporte } from '../../../src/services/reportPhotosService';
import {
  crearReporteLocal,
  sincronizarReportesPendientes,
} from '../../../src/services/reportsService';
import type { Linea, MotivoDemora } from '../../../src/types';
import {
  guardarUsuarioReportes,
  obtenerUsuarioReportes,
} from '../../../src/services/reportUserService';

// motivos que puede seleccionar el usuario
const motivos: { valor: MotivoDemora; texto: string }[] = [
  { valor: 'no_paso', texto: 'El colectivo no pasó' },
  { valor: 'paso_lleno', texto: 'El colectivo pasó lleno' },
  { valor: 'demorado', texto: 'El colectivo está demorado' },
  { valor: 'unidad_rota', texto: 'La unidad está rota' },
  { valor: 'calle_cortada', texto: 'La calle está cortada' },
];

export default function ReportarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { paleta } = useTheme();

  const [lineas, setLineas] = useState<Linea[]>([]);
  const [lineaId, setLineaId] = useState('');
  const [motivo, setMotivo] = useState<MotivoDemora | null>(null);
  const [comentario, setComentario] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // lineas que pasan por esta parada
  useEffect(() => {
    async function cargarLineas() {
      try {
        if (!id) return;

        const parada = await stopsService.getStopById(id);

        if (!parada) {
          Alert.alert('Error', 'No se encontró la parada.');
          return;
        }

        const resultado = await stopsService.getLinesForStop(
          parada.lineaIds
        );

        setLineas(resultado);
      } catch (error) {
        Alert.alert('Error', 'No se pudieron cargar las líneas.');
      } finally {
        setCargando(false);
      }
    }

    void cargarLineas();
  }, [id]);

  // sacar foto
  async function sacarFoto() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();

    if (!permiso.granted) {
      Alert.alert(
        'Permiso necesario',
        'Necesitamos acceder a la cámara para sacar la fotografía.'
      );
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!resultado.canceled && resultado.assets.length > 0) {
      setFotoUri(resultado.assets[0].uri);
    }
  }

  // elegir foto de la galeria
  async function elegirFoto() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!resultado.canceled && resultado.assets.length > 0) {
      setFotoUri(resultado.assets[0].uri);
    }
  }

  // validar y guardar el reporte
  async function enviarReporte() {
    if (enviando) return;

    if (!id || !lineaId || !motivo) {
      Alert.alert(
        'Faltan datos',
        'Seleccioná una línea y el motivo del reporte.'
      );
      return;
    }

    if (!fotoUri) {
      Alert.alert(
        'Fotografía obligatoria',
        'Tenés que adjuntar una fotografía para continuar.'
      );
      return;
    }

    setEnviando(true);

    try {

        let usuarioId: string;

        try {
          // obterner usuario desde la api y guardar id para usar sin conexion
          usuarioId = await guardarUsuarioReportes();
        } catch (error) {
          usuarioId = await obtenerUsuarioReportes();
        }

      // guarda la foto
      const fotoGuardada = await guardarFotoReporte(fotoUri);

      // guarda el reporte
      await crearReporteLocal({
        paradaId: id,
        lineaId,
        motivo,
        comentario: comentario.trim() || null,
        fotoUri: fotoGuardada,
        usuarioId: usuarioId,
      });

      // enviar reportes pendientes a la api
      await sincronizarReportesPendientes();

      // vibracion al confirmar
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      Alert.alert(
        'Reporte guardado',
        'Tu reporte se guardó correctamente. Si hay conexión y una sesión activa, se intentará enviarlo al servidor.',
        [{ text: 'Aceptar', onPress: () => router.back() }]
      );
    
    } catch (error) {
      console.error('Error al guardar el reporte:', error);

      const mensaje = error instanceof Error
        ? error.message
        : 'No se pudo guardar el reporte. Intentá nuevamente.';

      Alert.alert('No se pudo guardar el reporte', mensaje);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={paleta.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: paleta.background }}
      contentContainerStyle={styles.contenedor}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Reportar demora' }} />

      <ThemedText variant="title">
        Reportar un problema
      </ThemedText>

      <ThemedText color={paleta.textMuted}>
        Ayudá a otros pasajeros compartiendo lo que pasó.
      </ThemedText>

      {/* selección de la linea */}
      <ThemedText variant="subtitle">
        1. ¿Qué línea querés reportar?
      </ThemedText>

      {lineas.length === 0 ? (
        <ThemedText color={paleta.textMuted}>
          No hay líneas disponibles para esta parada.
        </ThemedText>
      ) : (
        <View style={styles.opciones}>
          {lineas.map((linea) => (
            <Pressable
              key={linea.id}
              onPress={() => setLineaId(linea.id)}
              style={[
                styles.opcion,
                {
                  borderColor:
                    lineaId === linea.id
                      ? paleta.primary
                      : paleta.border,
                  backgroundColor: paleta.surface,
                },
              ]}
            >
              <ThemedText>
                Línea {linea.numero}
              </ThemedText>
              {lineaId === linea.id && (
                <ThemedText color={paleta.primary}>
                  ✓
                </ThemedText>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* selección de motivo */}
      <ThemedText variant="subtitle">
        2. ¿Qué ocurrió?
      </ThemedText>

      <View style={styles.opciones}>
        {motivos.map((opcion) => (
          <Pressable
            key={opcion.valor}
            onPress={() => setMotivo(opcion.valor)}
            style={[
              styles.opcion,
              {
                borderColor:
                  motivo === opcion.valor
                    ? paleta.primary
                    : paleta.border,
                backgroundColor: paleta.surface,
              },
            ]}
          >
            <ThemedText>{opcion.texto}</ThemedText>
            {motivo === opcion.valor && (
              <ThemedText color={paleta.primary}>✓</ThemedText>
            )}
          </Pressable>
        ))}
      </View>

      {/* comentario (opcional) */}
      <ThemedText variant="subtitle">
        3. Comentario (opcional)
      </ThemedText>

      <TextInput
        value={comentario}
        onChangeText={setComentario}
        placeholder="Contanos qué pasó..."
        placeholderTextColor={paleta.textMuted}
        multiline
        maxLength={300}
        style={[
          styles.comentario,
          {
            color: paleta.text,
            backgroundColor: paleta.surface,
            borderColor: paleta.border,
          },
        ]}
      />

      {/* foto (obligatoria) */}
      <ThemedText variant="subtitle">
        4. Adjuntá una fotografía *
      </ThemedText>

      <View style={styles.botonesFoto}>
        <Pressable
          onPress={sacarFoto}
          style={[styles.botonFoto, { borderColor: paleta.primary }]}
        >
          <ThemedText color={paleta.primary}>
            📷 Sacar foto
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={elegirFoto}
          style={[styles.botonFoto, { borderColor: paleta.primary }]}
        >
          <ThemedText color={paleta.primary}>
            Elegir de galería
          </ThemedText>
        </Pressable>
      </View>

      {fotoUri && (
        <Image
          source={{ uri: fotoUri }}
          style={styles.imagen}
        />
      )}

      {/* enviar reporte */}
      <Pressable
        onPress={enviarReporte}
        disabled={enviando}
        style={[
          styles.botonEnviar,
          { backgroundColor: paleta.primary },
          enviando && { opacity: 0.6 },
        ]}
      >
        {enviando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText variant="bold" color="#FFFFFF">
            Enviar reporte
          </ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenedor: {
    padding: 20,
    paddingBottom: 50,
    gap: 16,
  },
  opciones: {
    gap: 8,
  },
  opcion: {
    padding: 14,
    borderWidth: 1.5,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comentario: {
    height: 100,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    textAlignVertical: 'top',
  },
  botonesFoto: {
    flexDirection: 'row',
    gap: 10,
  },
  botonFoto: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagen: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  botonEnviar: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
});
