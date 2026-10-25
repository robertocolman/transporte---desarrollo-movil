import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router/stack';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { colors } from '@/theme/colors';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BiometricStartup from '@/components/BiometricStartup';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
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
                name="paradas/[id]"
                options={{
                  title: 'Detalle de Parada',
                  headerBackTitle: 'Paradas',
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
