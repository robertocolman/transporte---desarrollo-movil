import { StyleSheet, Text, type TextProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export interface ThemedTextProps extends TextProps {
  variant?: 'title' | 'subtitle' | 'body' | 'caption' | 'bold';
  color?: string;
}

export function ThemedText({ children, style, variant = 'body', color, ...rest }: ThemedTextProps) {
  const { paleta } = useTheme();

  return (
    <Text
      style={[
        { color: color ?? paleta.text },
        variantStyles[variant],
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const variantStyles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bold: {
    fontSize: 14,
    fontWeight: '700',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
  },
});
