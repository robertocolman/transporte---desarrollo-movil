import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export interface ThemedViewProps extends ViewProps {
  surface?: boolean;
}

export function ThemedView({ children, style, surface = false, ...rest }: ThemedViewProps) {
  const { paleta } = useTheme();

  return (
    <View
      style={[
        { backgroundColor: surface ? paleta.surface : paleta.background },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
