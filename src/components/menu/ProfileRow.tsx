import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Badge, Icon, Text, theme, type IconName } from '@/ui';

const { colors, spacing, iconSize } = theme;

/**
 * Satır geometrisi — TEK kaynak: satırın kendisi ve `SkeletonMenuRow` buradan okur.
 * `flat` (kartsız liste, Storytel "Profilim" ≈ 56pt) · `card` (`SectionCard` içinde, 48pt; kartın
 * 12'lik iç boşluğuna negatif marjla taşar, aynı dolguyla içerik hizalı).
 */
export const PROFILE_ROW_METRICS = {
  gap: spacing[4],
  iconSize: iconSize.lg,
  chevronSize: iconSize.md,
  flat: { minHeight: spacing[12] + spacing[2], paddingHorizontal: spacing[4], marginHorizontal: 0 },
  card: { minHeight: theme.controlHeight.lg, paddingHorizontal: spacing[3], marginHorizontal: -spacing[3] },
} as const;
const ROW_HEIGHT = PROFILE_ROW_METRICS.flat.minHeight;

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
  /** Bekleyen iş sayacı (takas/teklif); 0 ise çizilmez. Rozet testID `${testID}-badge`. */
  count?: number;
  /** Sağdaki chevron (varsayılan açık); gerekirse kapatılabilir. */
  chevron?: boolean;
  role?: 'link' | 'button';
  /**
   * `card`: `SectionCard` içinde — satır kartın iç boşluğuna (12) taşar (basılı zemin kenardan kenara),
   * içerik kart başlığıyla hizalı; boy `controlHeight.lg` (48). `flat` (varsayılan): kartsız liste (56).
   */
  variant?: 'flat' | 'card';
}

/**
 * Profil listesi satırı — düz (kartsız): sol ikon + etiket + (rozet) + sağ chevron.
 * Profil, misafir profil ve Ayarlar ekranları ortak kullanır.
 */
export function ProfileRow({
  label,
  onPress,
  icon,
  testID,
  tone = 'default',
  rightBadge,
  count = 0,
  chevron = true,
  role = 'link',
  variant = 'flat',
}: ProfileRowProps) {
  const labelTone = tone === 'default' ? 'heading' : tone;
  return (
    <Pressable
      testID={testID}
      accessibilityRole={role}
      onPress={onPress}
      style={({ pressed }) => [styles.row, variant === 'card' && styles.cardRow, pressed && styles.pressed]}
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
      {count > 0 ? (
        <Badge variant="danger" appearance="solid" size="sm" testID={testID ? `${testID}-badge` : undefined}>
          {count > 99 ? '99+' : String(count)}
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
    gap: PROFILE_ROW_METRICS.gap,
    paddingHorizontal: PROFILE_ROW_METRICS.flat.paddingHorizontal,
  },
  // SectionCard `padding: spacing[3]`: negatif marjla kart kenarına taşar, aynı dolguyla içerik hizalı.
  cardRow: PROFILE_ROW_METRICS.card,
  pressed: { backgroundColor: colors.surface.alt },
  label: { flex: 1 },
});
