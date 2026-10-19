import { useEffect, useState } from 'react';
import { Magnetometer } from 'expo-sensors';

export function useCompassHeading() {
  const [heading, setHeading] = useState<number>(0); // 0° = Norte, 90° = Este, etc.
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(true);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    (async () => {
      // 1. Verificamos si el hardware del dispositivo cuenta con magnetómetro
      const available = await Magnetometer.isAvailableAsync();
      if (!available) {
        setIsSensorAvailable(false);
        return;
      }

      // 2. Fijamos frecuencia de actualización (100 ms según Unidad 4 - Diapositiva 20)
      Magnetometer.setUpdateInterval(100);

      // 3. Suscripción al sensor magnético
      subscription = Magnetometer.addListener((data) => {
        const { x, y } = data;
        // Cálculo del ángulo en radianes respecto a los ejes y conversión a grados
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        // Normalizamos en rango positivo 0..360
        let headingDegrees = Math.round((angle + 360) % 360);
        setHeading(headingDegrees);
      });
    })();

    // 4. Limpieza del listener al desmontar el componente (evita memory leaks y gasto de batería)
    return () => {
      subscription?.remove();
    };
  }, []);

  /**
   * Calcula el ángulo de giro de la flecha en la pantalla:
   * (Rumbo geográfico del destino - Orientación actual del teléfono)
   */
  const getRelativeAngle = (targetBearing: number): number => {
    return Math.round((targetBearing - heading + 360) % 360);
  };

  return {
    heading,
    isSensorAvailable,
    getRelativeAngle,
  };
}
