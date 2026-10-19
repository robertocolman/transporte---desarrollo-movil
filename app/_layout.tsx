import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router/stack';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Transporte Paraná',
            headerShown: true,
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
    </ThemeProvider>
  );
}
