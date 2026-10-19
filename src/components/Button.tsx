import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './ThemedText';

export interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  variant = 'primary',
  isLoading = false,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const { paleta } = useTheme();

  const getBackgroundColor = (pressed: boolean) => {
    if (disabled || isLoading) return paleta.border;
    if (variant === 'primary') return pressed ? paleta.accentMuted : paleta.primary;
    if (variant === 'secondary') return pressed ? paleta.surfaceHighlight : paleta.surface;
    if (variant === 'outline') return pressed ? paleta.surfaceHighlight : 'transparent';
    if (variant === 'danger') return pressed ? '#b91c1c' : paleta.danger;
    return paleta.primary;
  };

  const getTextColor = () => {
    if (disabled || isLoading) return paleta.textMuted;
    if (variant === 'primary' || variant === 'danger') return paleta.onPrimary;
    if (variant === 'outline') return paleta.accent;
    return paleta.text;
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: variant === 'outline' ? paleta.accent : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
        },
        style,
      ]}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <ThemedText variant="bold" style={{ color: getTextColor() }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
