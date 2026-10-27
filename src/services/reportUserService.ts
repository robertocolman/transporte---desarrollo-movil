
import Storage from 'expo-sqlite/kv-store';
import { authService } from './authService';

const USER_ID_KEY = 'report_user_id';

export async function guardarUsuarioReportes(): Promise<string> {
  const respuesta = await authService.getCurrentUser();
  const usuarioId = respuesta.datos.id as string;

  await Storage.setItem(USER_ID_KEY, usuarioId);

  return usuarioId;
}

export async function obtenerUsuarioReportes(): Promise<string> {

  const token = await authService.getToken();

  if (!token) {
    throw new Error(
      'Necesitás iniciar sesión o desbloquear tu sesión para reportar.'
    );
  }

  const usuarioId = await Storage.getItem(USER_ID_KEY);

  if (!usuarioId) {
    throw new Error(
      'Necesitás conectarte a Internet e iniciar sesión al menos una vez.'
    );
  }

  return usuarioId;
}


export async function limpiarUsuarioReportes(): Promise<void> {
  await Storage.removeItem(USER_ID_KEY);
}
