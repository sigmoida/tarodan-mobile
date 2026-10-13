import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { RawText } from './Text';
import { HeaderIconButton } from './HeaderIconButton';
import { theme } from '../lib/theme';

/**
 * @deprecated Eski turuncu/açık ayrımı. Yığın ekranlarının üst barı artık TEK görünüm: web'in
 * sade beyaz barı. Prop geriye uyum için kabul edilir, görünümü değiştirmez.
 */
export type ScreenHeaderVariant = 'primary' | 'light';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** @deprecated Bkz. `ScreenHeaderVariant`. */
  variant?: ScreenHeaderVariant;
  onBack?: () => void;
  showBack?: boolean;
  /** Sağ aksiyon(lar). Beyaz zemin: ikonlar başlık rengi olmalı — `TopBarAction` kullanın. */
  right?: React.ReactNode;
  /** Varsayılan sola hizalı (web PageHeader gibi geri oku + başlık). */
  centerTitle?: boolean;
  style?: ViewStyle;
}

const { colors, spacing, typography, iconSize, minTouchTarget } = theme;

/** Üst bar satır yüksekliği (güvenli alan hariç). */
export const TOP_BAR_HEIGHT = 52;
const ICON_BOX = 40;

/**
 * Yığın ekranlarının üst barı (PageShell'in barı da bu): surface-elevated zemin, alt kenarlık,
 * geri oku (24, başlık rengi), tek satır başlık (lg/600), opsiyonel sağ aksiyon. Güvenli alanın
 * üstü dahil. StatusBar koyu içerik ister (kök layout varsayılanı).
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack = true,
  right,
  centerTitle = false,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const topPad = Math.max(insets.top, Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24));
  const align = centerTitle ? 'center' : 'left';

  return (
    <View style={[styles.container, { paddingTop: topPad }, style]}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={onBack}
            disabled={!onBack}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            hitSlop={(minTouchTarget - ICON_BOX) / 2 + 4}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={iconSize.lg} color={colors.text.heading} />
          </Pressable>
        ) : centerTitle ? (
          <View style={styles.iconBtn} />
        ) : (
          <View style={styles.leadingGap} />
        )}

        <View style={[styles.titleWrap, centerTitle && styles.titleCenter]}>
          <RawText
            style={[styles.title, { textAlign: align }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </RawText>
          {subtitle ? (
            <RawText style={[styles.subtitle, { textAlign: align }]} numberOfLines={1}>
              {subtitle}
            </RawText>
          ) : null}
        </View>

        <View style={styles.rightSlot}>
          {right ?? (centerTitle ? <View style={styles.iconBtn} /> : null)}
        </View>
      </View>
    </View>
  );
};

export interface TopBarActionProps {
  /** İkon (başlık renginde, 24) ya da kısa metin aksiyonu ("Kaydet"). */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  label?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** İkonun üstünde sayaç rozeti (danger-500). */
  count?: number;
  testID?: string;
}

/**
 * Beyaz üst barın sağ aksiyonu. İkon başlık renginde (turuncu bardan kalma beyaz ikonlar beyaz
 * zeminde görünmez olurdu); metin aksiyonu primary-600 / 600 ağırlık.
 */
export const TopBarAction: React.FC<TopBarActionProps> = ({
  icon,
  label,
  onPress,
  accessibilityLabel,
  disabled,
  count,
  testID,
}) =>
  icon ? (
    <HeaderIconButton
      icon={icon}
      label={accessibilityLabel ?? label ?? icon}
      onPress={onPress}
      count={count}
      disabled={disabled}
      testID={testID}
      tone="onSurface"
    />
  ) : (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.textBtn, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <RawText style={styles.textAction}>{label}</RawText>
    </Pressable>
  );

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    paddingHorizontal: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOP_BAR_HEIGHT,
    gap: spacing[1],
  },
  iconBtn: {
    width: ICON_BOX,
    height: ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radiusRole.button,
  },
  leadingGap: {
    width: spacing[2],
  },
  textBtn: {
    minHeight: ICON_BOX,
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surface.alt,
  },
  disabled: {
    opacity: 0.5,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleCenter: { alignItems: 'center' },
  title: {
    fontSize: typography.fontSize.lg,
    lineHeight: typography.fontSize.lg * typography.lineHeight.snug,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.heading,
  },
  subtitle: {
    marginTop: spacing[0.5],
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[1],
  },
  textAction: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[600],
  },
});
