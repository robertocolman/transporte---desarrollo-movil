import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Network from 'expo-network';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ThemedText';
import {
  formatRelativeSyncAge,
  getLatestSyncTimestamp,
  subscribeSyncUpdates,
} from '@/services/localDb';

const STALE_DATA_THRESHOLD_MS = 60 * 60_000; // 1 hora

/**
 * Banner global de estado de red (`expo-network`) y frescura de datos locales (Requisito 7 + PRD p. 3).
 * Informa claramente cuando el teléfono está sin conexión y cuán vieja es la copia local en SQLite.
 */
export function NetworkStatusBanner() {
  const { paleta } = useTheme();
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  const [lastSyncIso, setLastSyncIso] = useState<string | null>(null);
  const [, setTick] = useState<number>(0);

  const refreshSyncMeta = useCallback(async () => {
    try {
      const latest = await getLatestSyncTimestamp();
      setLastSyncIso(latest);
    } catch {
      // Ignorar si la base aún se está inicializando
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let wasOffline = false;

    async function checkInitialNetwork() {
      try {
        const state = await Network.getNetworkStateAsync();
        const offlineNow =
          state.isConnected === false || state.isInternetReachable === false;
        wasOffline = offlineNow;
        if (mounted) {
          setIsOffline(offlineNow);
        }
      } catch {
        // Ignorar fallo de lectura inicial
      }
    }

    void checkInitialNetwork();
    void refreshSyncMeta();

    const netSubscription = Network.addNetworkStateListener((state) => {
      const offlineNow =
        state.isConnected === false || state.isInternetReachable === false;

      if (!mounted) return;
      setIsOffline(offlineNow);

      if (wasOffline && !offlineNow) {
        setJustReconnected(true);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          if (mounted) setJustReconnected(false);
        }, 3500);
      }
      wasOffline = offlineNow;
    });

    const unsubSync = subscribeSyncUpdates(() => {
      void refreshSyncMeta();
    });

    // Re-evalúa el texto relativo ("hace X minutos") cada 30 segundos
    const ageTimer = setInterval(() => {
      if (mounted) setTick((t) => t + 1);
    }, 30_000);

    return () => {
      mounted = false;
      netSubscription.remove();
      unsubSync();
      clearInterval(ageTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [refreshSyncMeta]);

  const syncAgeText = formatRelativeSyncAge(lastSyncIso);

  const isDataStale =
    Boolean(lastSyncIso) &&
    Date.now() - new Date(lastSyncIso as string).getTime() >
      STALE_DATA_THRESHOLD_MS;

  if (isOffline) {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: `${paleta.warning}22`,
            borderBottomColor: paleta.warning,
          },
        ]}
      >
        <Ionicons name="cloud-offline" size={16} color={paleta.warning} />
        <ThemedText
          variant="caption"
          color={paleta.text}
          style={styles.bannerText}
        >
          <ThemedText variant="bold" color={paleta.warning} style={{ fontSize: 12 }}>
            Sin conexión ·{' '}
          </ThemedText>
          {lastSyncIso
            ? `Mostrando copia local (${syncAgeText}).`
            : 'No hay datos descargados en el teléfono todavía.'}
        </ThemedText>
      </View>
    );
  }

  if (justReconnected) {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: `${paleta.success}20`,
            borderBottomColor: paleta.success,
          },
        ]}
      >
        <Ionicons name="wifi" size={16} color={paleta.success} />
        <ThemedText
          variant="caption"
          color={paleta.success}
          style={[styles.bannerText, { fontWeight: '700' }]}
        >
          Conexión restablecida · Sincronizando datos pendientes
        </ThemedText>
      </View>
    );
  }

  if (isDataStale) {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: paleta.surfaceHighlight,
            borderBottomColor: paleta.border,
          },
        ]}
      >
        <Ionicons name="time-outline" size={15} color={paleta.textMuted} />
        <ThemedText
          variant="caption"
          color={paleta.textMuted}
          style={styles.bannerText}
        >
          Información local {syncAgeText}. Deslizá para actualizar.
        </ThemedText>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
