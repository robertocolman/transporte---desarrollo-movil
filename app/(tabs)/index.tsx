import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { FavoritosRapidos } from '@/components/FavoritosRapidos';

export default function HomeScreen() {
  const { paleta } = useTheme();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: paleta.background }]}
      contentContainerStyle={styles.content}
>
      {/* Banner de Bienvenida */}
      <View style={[styles.heroCard, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
        <View style={[styles.iconCircle, { backgroundColor: `${paleta.primary}20` }]}>
          <Ionicons name="bus" size={38} color={paleta.primary} />
        </View>
        <ThemedText variant="title" style={styles.heroTitle}>
          Transporte Paraná
        </ThemedText>
        <ThemedText variant="body" color={paleta.textMuted} style={styles.heroSubtitle}>
          Dirección de Transporte de la Municipalidad de Paraná.
        </ThemedText>
        <View style={[styles.tag, { backgroundColor: `${paleta.accent}15` }]}>
          <ThemedText variant="caption" color={paleta.accent} style={{ fontWeight: '700' }}>
            RED URBANA DE COLECTIVOS
          </ThemedText>
        </View>
      </View>

      {/* Acciones Rápidas */}
      <View style={styles.section}>
        <ThemedText variant="subtitle" style={styles.sectionTitle}>
          Servicios para el Pasajero
        </ThemedText>

        <Button
          title="📍 Ver Paradas Cercanas y Mapa"
          variant="primary"
          style={styles.actionButton}
          onPress={() => router.push('/paradas')}
        />

        <Button
          title="📷 Escanear Código QR de Parada"
          variant="outline"
          style={styles.actionButton}
          onPress={() => router.push('/paradas/escanear-qr')}
        />
      </View>

      {/* Favoritos personales del usuario */}
      <FavoritosRapidos />

      {/* Accesos Rápidos a Paradas Frecuentes */}
      <View style={[styles.infoCard, { backgroundColor: paleta.surfaceHighlight, borderColor: paleta.border }]}>
        <ThemedText variant="bold" color={paleta.text}>
          ⚡ Paradas Frecuentes:
        </ThemedText>
        <ThemedText variant="body" color={paleta.textMuted} style={{ marginTop: 4 }}>
          Acceso directo a las paradas principales de la ciudad:
        </ThemedText>

        <View style={styles.quickLinks}>
          <Button
            title="Alameda y Urquiza (L5, L14)"
            variant="secondary"
            style={styles.linkBtn}
            onPress={() => router.push('/paradas/par-101')}
          />
          <Button
            title="Peatonal San Martín y 25 de Mayo (L1, L5)"
            variant="secondary"
            style={styles.linkBtn}
            onPress={() => router.push('/paradas/par-102')}
          />
          <Button
            title="Casa de Gobierno (Laprida y Santa Fe)"
            variant="secondary"
            style={styles.linkBtn}
            onPress={() => router.push('/paradas/par-103')}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    textAlign: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 14,
  },
  actionButton: {
    marginBottom: 12,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  quickLinks: {
    marginTop: 12,
    gap: 8,
  },
  linkBtn: {
    paddingVertical: 10,
    minHeight: 40,
  },
  footerNote: {
    marginTop: 12,
    paddingTop: 16,
  },
});
