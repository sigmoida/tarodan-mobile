import { View } from 'react-native';
import { Text, theme } from '@/ui';

const { colors, spacing } = theme;

/** Karşı taraf yazarken mesaj listesinin altında görünen ipucu. */
export function TypingIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View
      testID="typing-indicator"
      style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}
    >
      <Text variant="caption" style={{ color: colors.text.muted }}>
        yazıyor…
      </Text>
    </View>
  );
}
