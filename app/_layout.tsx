import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router/stack';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { useTheme } from '@/hooks/use-theme';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BiometricStartup from '@/components/BiometricStartup';
import { ReportsSyncManager } from '@/components/ReportsSyncManager';
import { NetworkStatusBanner } from '@/components/NetworkStatusBanner';

function ThemedRootNavigator() {
  const { paleta, tema } = useTheme();

  return (
    <BiometricStartup>
      <ReportsSyncManager />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: paleta.background }}
        edges={['top']}
      >
        <StatusBar style={tema === 'dark' ? 'light' : 'dark'} />
        <NetworkStatusBanner />

        <Stack
          initialRouteName="(tabs)"
          screenOptions={{
            headerStyle: { backgroundColor: paleta.surface },
            headerTintColor: paleta.text,
            headerTitleStyle: {
              fontWeight: '700',
              color: paleta.text,
            },
            contentStyle: { backgroundColor: paleta.background },
          }}
        >
          <Stack.Screen
            name="(auth)/login"
            options={{
              title: 'Iniciar Sesión',
            }}
          />
          <Stack.Screen
            name="(auth)/register"
            options={{
              title: 'Registro',
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="paradas/index"
            options={{
              title: 'Paradas de Colectivo',
              headerBackTitle: 'Atrás',
            }}
          />
          <Stack.Screen
            name="paradas/[id]/index"
            options={{
              title: 'Detalle de Parada',
              headerBackTitle: 'Atrás',
            }}
          />
          <Stack.Screen
            name="paradas/[id]/reportar"
            options={{
              title: 'Reportar Demora',
              headerBackTitle: 'Atrás',
            }}
          />
          <Stack.Screen
            name="paradas/[id]/horarios"
            options={{
              title: 'Horarios y Frecuencias',
              headerBackTitle: 'Atrás',
            }}
          />
          <Stack.Screen
            name="lineas/[id]"
            options={{
              title: 'Recorrido de Línea',
              headerBackTitle: 'Atrás',
            }}
          />
          <Stack.Screen
            name="avisos/index"
            options={{
              title: 'Avisos y Novedades',
              headerBackTitle: 'Atrás',
            }}
          />
          <Stack.Screen
            name="paradas/escanear-qr"
            options={{
              title: 'Escanear QR de Parada',
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>
      </SafeAreaView>
    </BiometricStartup>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedRootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
