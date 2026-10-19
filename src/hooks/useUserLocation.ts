import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface UserCoords {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export function useUserLocation() {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestPermission = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      // 1. Pedimos permiso de primer plano ("Mientras uso la app")
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setPermissionGranted(false);
        setIsLoading(false);
        setErrorMsg('Permiso de ubicación denegado. Podés buscar paradas por nombre.');
        return false;
      }

      setPermissionGranted(true);

      // 2. Patrón de doble lectura (Unidad 4 - Diapositiva 12):
      // Primero pedimos la última conocida (instantánea) para mostrar datos de inmediato
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        setCoords({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          accuracy: lastKnown.coords.accuracy,
        });
      }

      // Luego la posición actual precisa
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy,
      });

      setIsLoading(false);
      return true;
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener la ubicación');
      setIsLoading(false);
      return false;
    }
  };

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const granted = await requestPermission();
      if (!granted) return;

      // 3. Seguimiento de posición en vivo (Unidad 4 - Diapositiva 13)
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Actualizar cada 10 metros de movimiento
        },
        (loc) => {
          setCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
          });
        }
      );
    })();

    // 4. LIMPIEZA OBLIGATORIA (Unidad 4): Sin esto el GPS sigue prendido y vacía la batería
    return () => {
      subscription?.remove();
    };
  }, []);

  return {
    coords,
    isLoading,
    permissionGranted,
    isPermissionDenied: permissionGranted === false,
    errorMsg,
    refreshLocation: requestPermission,
  };
}
