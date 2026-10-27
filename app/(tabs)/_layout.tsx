
import { Tabs } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const { paleta } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: paleta.primary,
        tabBarInactiveTintColor: paleta.textMuted,
        tabBarStyle: {
          backgroundColor: paleta.surface,
          borderTopColor: paleta.border,
          borderTopWidth: 1,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="lineas/index"
        options={{
          title: 'Líneas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="bus-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Yo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-circle-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
