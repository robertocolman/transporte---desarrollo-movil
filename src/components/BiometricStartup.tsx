import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { biometricService } from '@/services/biometricService';
import { authService } from '@/services/authService';
import { useTheme } from '@/hooks/use-theme';

export default function BiometricStartup({
  children,
}: {
  children: React.ReactNode;
}) {
  const { paleta } = useTheme();
  const [comprobando, setComprobando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function iniciar() {
      try {
        const haySesion =
          await authService.tieneSesionGuardada();

        const biometriaActiva =
          await biometricService.estaActivada();

        if (haySesion && biometriaActiva) {
          biometricService.bloquearSesion();
          await biometricService.autenticar();
        }
      } catch (error) {
        console.error('Error al iniciar biometría:', error);
      } finally {
        if (activo) setComprobando(false);
      }
    }

    iniciar();

    return () => {
      activo = false;
    };
  }, []);

  if (comprobando) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: paleta.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator
          size="large"
          color={paleta.primary}
        />
      </View>
    );
  }

  return <>{children}</>;
}