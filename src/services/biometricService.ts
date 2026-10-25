import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const BIOMETRIA_KEY = 'biometria_activada';

let sesionDesbloqueada = false;

export const biometricService = {
  estaActivada: async () => {
    return (await SecureStore.getItemAsync(BIOMETRIA_KEY)) === 'true';
  },

  estaDesbloqueada: () => sesionDesbloqueada,

  desbloquearSesion: () => {
    sesionDesbloqueada = true;
  },

  bloquearSesion: () => {
    sesionDesbloqueada = false;
  },

  autenticar: async (): Promise<boolean> => {
    const tieneHardware =
      await LocalAuthentication.hasHardwareAsync();

    const tieneBiometria =
      await LocalAuthentication.isEnrolledAsync();

    if (!tieneHardware || !tieneBiometria) {
      return false;
    }

    const resultado =
      await LocalAuthentication.authenticateAsync({
        promptMessage: 'Ingresar a Transporte Paraná',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: true,
      });

    if (resultado.success) {
      sesionDesbloqueada = true;
      return true;
    }

    return false;
  },

  activar: async () => {
    const correcto = await biometricService.autenticar();

    if (!correcto) return false;

    await SecureStore.setItemAsync(BIOMETRIA_KEY, 'true');
    return true;
  },

  desactivar: async () => {
    await SecureStore.deleteItemAsync(BIOMETRIA_KEY);
    sesionDesbloqueada = true;
  },

  limpiarSesion: async () => {
    await SecureStore.deleteItemAsync(BIOMETRIA_KEY);
    sesionDesbloqueada = false;
  },
};