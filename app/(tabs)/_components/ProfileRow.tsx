import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Badge, Icon, Text, theme, type IconName } from '@/ui';

const { colors, spacing, iconSize } = theme;

/** Satır yüksekliği (Storytel "Profilim" listesi ≈ 56pt). */
const ROW_HEIGHT = spacing[12] + spacing[2];

interface ProfileRowProps {
  label: string;
  onPress: () => void;
  /** Soldaki outline ikon (24pt, başlık rengi; `danger` tonda etiketle aynı danger-700). */
  icon?: IconName;
  testID?: string;
  /** `primary` = marka tonlu etiket · `danger` = tehlike tonlu etiket (çıkış). */
  tone?: 'default' | 'primary' | 'danger';
  /** Etiketin sağında metin rozeti (ör. üyelik katmanı). */
  rightBadge?: string;
  /** Sağdaki chevron (varsayılan açık); gerekirse kapatılabilir. */
  chevron?: boolean;
  role?: 'link' | 'button';
}

/**
 * Profil listesi satırı — düz (kartsız): sol ikon + etiket + (rozet) + sağ chevron.
 * Üye ve misafir profil ekranları ortak kullanır.
 */
export function ProfileRow({
  label,
  onPress,
  icon,
  testID,
  tone = 'default',
  rightBadge,
  chevron = true,
  role = 'link',
}: ProfileRowProps) {
  const labelTone = tone === 'default' ? 'heading' : tone;
  return (
    <Pressable
      testID={testID}
      accessibilityRole={role}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={iconSize.lg}
          color={tone === 'danger' ? colors.danger[700]! : colors.text.heading}
        />
      ) : null}
      <Text
        variant="body"
        tone={labelTone}
        weight={tone === 'primary' ? 'medium' : 'regular'}
        style={styles.label}
        numberOfLines={1}
      >
        {label}
      </Text>
      {rightBadge ? (
        <Badge variant="default" size="sm">
          {rightBadge}
        </Badge>
      ) : null}
      {chevron ? (
        <Icon
          testID={testID ? `${testID}-chevron` : undefined}
          name="chevron-right"
          size={iconSize.md}
          color={colors.text.subtle}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[4],
  },
  pressed: { backgroundColor: colors.surface.alt },
  label: { flex: 1 },
});
