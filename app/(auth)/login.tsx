import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { authService } from '@/services/authService';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const { paleta } = useTheme();

  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const result = await authService.login(
        email,
        password
      );

      console.log(result);

      console.log('Login correcto', result);

      Alert.alert(
        'Éxito',
        'Inicio de sesión correcto'
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message
      );
    } finally {
      setLoading(false);
    }
    
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: paleta.background }
      ]}
    >
      <ThemedText
        variant="title"
        style={styles.title}
      >
        Iniciar Sesión
      </ThemedText>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={[
          styles.input,
          {
            backgroundColor: paleta.surface,
            color: paleta.text,
            borderColor: paleta.border,
          },
        ]}
      />
      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[
          styles.input,
          {
            backgroundColor: paleta.surface,
            color: paleta.text,
            borderColor: paleta.border,
          },
        ]}
      />
      <Button
        title="Ingresar"
        onPress={handleLogin}
        isLoading={loading}
      />
      <Button
        title="Crear cuenta"
        variant="outline"
        onPress={() => {
            router.push('/register');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },

  title: {
    textAlign: 'center',
    marginBottom: 30,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
});