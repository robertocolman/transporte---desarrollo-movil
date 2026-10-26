import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router/stack';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { colors } from '@/theme/colors';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BiometricStartup from '@/components/BiometricStartup';
import { ReportsSyncManager } from '../src/components/ReportsSyncManager';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ReportsSyncManager />
        <BiometricStartup>
          <SafeAreaView
            style={{ flex: 1, backgroundColor: colors.background }}
            edges={['top']}
          >
            <StatusBar style="dark" />

            <Stack
              initialRouteName="(tabs)"
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
                headerTitleStyle: {
                  fontWeight: '700',
                  color: colors.text,
                },
                contentStyle: { backgroundColor: colors.background },
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
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
