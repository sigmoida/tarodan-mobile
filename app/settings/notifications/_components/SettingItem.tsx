import { View } from 'react-native';
import { Switch, Text } from '@/ui';
import { styles } from '../_lib/styles';

/** Tek bildirim ayarı satırı — etiket/açıklama + switch (satır başı ikonu yok). */
export function SettingItem({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <Text variant="body">{label}</Text>
        <Text variant="bodySm" tone="muted" style={styles.settingDescription}>
          {description}
        </Text>
      </View>
      <Switch value={value} onValueChange={onToggle} accessibilityLabel={label} />
    </View>
  );
}
