import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function PerfilScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icono}>👤</Text>

      <Text style={styles.titulo}>Mi perfil</Text>

      <Text style={styles.descripcion}>
        Iniciá sesión para guardar tus favoritos
        y personalizar tu experiencia.
      </Text>

      <Pressable
        style={styles.boton}
        onPress={() => router.push('/login')}
      >
        <Text style={styles.textoBoton}>
          Iniciar sesión
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/register')}
      >
        <Text style={styles.registro}>
          ¿No tenés cuenta? Registrate
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  icono: {
    fontSize: 60,
    marginBottom: 16,
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  descripcion: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 28,
    color: '#64748B',
  },
  boton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  textoBoton: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registro: {
    marginTop: 20,
    color: '#2563EB',
    fontSize: 15,
  },
});