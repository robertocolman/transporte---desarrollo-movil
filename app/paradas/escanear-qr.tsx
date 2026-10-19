import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { stopsService } from '@/services/stopsService';

export default function EscanearQrScreen() {
  const { paleta } = useTheme();
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  // Manejo de permisos de cámara
  if (!permission) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: paleta.background }]}>
        <ThemedText variant="body">Verificando permisos de cámara...</ThemedText>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: paleta.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: `${paleta.primary}15` }]}>
          <Ionicons name="camera" size={40} color={paleta.primary} />
        </View>
        <ThemedText variant="title" style={{ marginTop: 16, textAlign: 'center' }}>
          Permiso de Cámara Requerido
        </ThemedText>
        <ThemedText
          variant="body"
          color={paleta.textMuted}
          style={{ textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}
        >
          Para escanear el código QR impreso en el cartel de la parada, necesitamos acceso a tu cámara.
        </ThemedText>
        <Button
          title="Conceder Permiso"
          variant="primary"
          style={{ marginTop: 24, minWidth: 200 }}
          onPress={requestPermission}
        />
        <Button
          title="Cancelar"
          variant="outline"
          style={{ marginTop: 10, minWidth: 200 }}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  // Callback al detectar un código QR
  const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
    // 1. BANDERA DE ESTADO (Unidad 4 - Diapositiva 7):
    // Evita que la función se dispare 30 veces por segundo en el mismo código
    setScanned(true);

    try {
      // 2. TOLERANCIA A CÓDIGOS AJENOS (Requisito explícito del PRD):
      // Si el código no empieza con "PARANA:" o no existe en la base, no rompemos la app
      if (!data.startsWith('PARANA:')) {
        Alert.alert(
          'Código QR no reconocido',
          `El código escaneado ("${data}") no corresponde a una parada de la red de Transporte Paraná.`,
          [{ text: 'Intentar de nuevo', onPress: () => setScanned(false) }]
        );
        return;
      }

      // 3. Consultamos el servicio
      const parada = await stopsService.getStopByQr(data);

      if (!parada) {
        Alert.alert(
          'Parada no identificada',
          `El código "${data}" no está registrado en el catálogo oficial de paradas vigentes.`,
          [{ text: 'Reintentar', onPress: () => setScanned(false) }]
        );
        return;
      }

      // 4. Si es válida, navegamos directamente al detalle de la parada
      router.replace(`/paradas/${parada.id}`);
    } catch (err: any) {
      Alert.alert('Error', 'Ocurrió un problema al procesar el código QR.', [
        { text: 'Aceptar', onPress: () => setScanned(false) },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Vista de Cámara */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torchEnabled}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        // Si ya fue escaneado, desactivamos el listener pasando undefined
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Máscara / Overlay de enfoque */}
      <View style={styles.overlay}>
        {/* Barra superior con controles */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </Pressable>

          <ThemedText variant="subtitle" color="#ffffff">
            Escanear QR de Parada
          </ThemedText>

          <Pressable
            style={[styles.iconButton, torchEnabled && styles.iconActive]}
            onPress={() => setTorchEnabled((prev) => !prev)}
            hitSlop={12}
          >
            <Ionicons
              name={torchEnabled ? 'flash' : 'flash-off'}
              size={24}
              color={torchEnabled ? '#facc15' : '#ffffff'}
            />
          </Pressable>
        </View>

        {/* Marco visual del escáner */}
        <View style={styles.scannerCenter}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <ThemedText variant="caption" color="#ffffff" style={styles.instructionText}>
            Apuntá la cámara al código QR impreso en el poste de la parada
          </ThemedText>
        </View>

        {/* Botón inferior si está bloqueado por escaneo previo */}
        <View style={styles.bottomBar}>
          {scanned && (
            <Button
              title="Volver a escanear"
              variant="primary"
              onPress={() => setScanned(false)}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
  },
  scannerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#38bdf8',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionText: {
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bottomBar: {
    paddingBottom: 20,
  },
});
