import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { authService } from '@/services/authService';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const { paleta } = useTheme();

  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      setLoading(true);

      await authService.register(
        nombre,
        email,
        password
      );

      Alert.alert(
        'Éxito',
        'Usuario registrado correctamente'
      );
      
      router.replace('/(tabs)/perfil');

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ backgroundColor: paleta.background }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText
          variant="title"
          style={styles.title}
        >
          Crear Cuenta
        </ThemedText>

        <TextInput
          placeholder="Nombre"
          placeholderTextColor={paleta.textMuted}
          value={nombre}
          onChangeText={setNombre}
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
          placeholder="Email"
          placeholderTextColor={paleta.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
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
          placeholderTextColor={paleta.textMuted}
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
          title="Registrarme"
          onPress={handleRegister}
          isLoading={loading}
        />

        <Button
          title="Volver al login"
          variant="outline"
          onPress={() => router.back()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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