import React, { createContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Palette, palettes } from '@/theme/colors';

type ColorScheme = 'dark' | 'light';

type ThemeContextType = {
  tema: ColorScheme;
  setTema: (tema: ColorScheme) => void;
  paleta: Palette;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const sistema = useColorScheme();
  const [tema, setTema] = useState<ColorScheme>(sistema === 'light' ? 'light' : 'dark');

  const value = useMemo(() => {
    return {
      tema,
      setTema,
      paleta: palettes[tema],
    };
  }, [tema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
