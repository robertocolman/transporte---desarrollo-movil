import React, {
  createContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { Palette, palettes } from '@/theme/colors';

type ColorScheme = 'dark' | 'light';
type PreferenciaTema = ColorScheme | 'system';

type ThemeContextType = {
  tema: ColorScheme;
  preferenciaTema: PreferenciaTema;
  setTema: (tema: PreferenciaTema) => void;
  paleta: Palette;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const sistema = useColorScheme();

  const [preferenciaTema, actualizarPreferencia] =
    useState<PreferenciaTema>('system');

  useEffect(() => {
    let activo = true;

    async function cargarTema() {
      try {
        const guardado = await Storage.getItem('tema');

        if (
          activo &&
          (guardado === 'light' ||
            guardado === 'dark' ||
            guardado === 'system')
        ) {
          actualizarPreferencia(guardado);
        }
      } catch (error) {
        console.error('Error al cargar el tema:', error);
      }
    }

    cargarTema();

    return () => {
      activo = false;
    };
  }, []);

  function setTema(nuevoTema: PreferenciaTema) {
    actualizarPreferencia(nuevoTema);

    Storage.setItem('tema', nuevoTema).catch((error) => {
      console.error('Error al guardar el tema:', error);
    });
  }

  const tema: ColorScheme =
    preferenciaTema === 'system'
      ? sistema === 'light'
        ? 'light'
        : 'dark'
      : preferenciaTema;

  const value = useMemo(() => {
    return {
      tema,
      preferenciaTema,
      setTema,
      paleta: palettes[tema],
    };
  }, [tema, preferenciaTema]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
