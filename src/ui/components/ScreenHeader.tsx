import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RawText, Text } from './Text';
import { HeaderIconButton } from './HeaderIconButton';
import { theme } from '../lib/theme';
import { useHeaderTopInset } from '../lib/header';

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
  /**
   * Geri okunun yerine özel öncül düğüm (ör. kapat X). Aynı kutu ölçüsünde çizilir; verilirse
   * `showBack`/`onBack` yok sayılır.
   */
  leading?: React.ReactNode;
  /** Başlık + alt başlık yerine özel içerik (ör. sohbet: avatar + ad + ürün). Tek satır sığmalı. */
  titleSlot?: React.ReactNode;
  /** Sağ aksiyon(lar). Beyaz zemin: ikonlar başlık rengi olmalı — `TopBarAction` kullanın. */
  right?: React.ReactNode;
  /**
   * @deprecated Başlık HER ZAMAN sola hizalı (iki platformda aynı). Prop geriye uyum için
   * kabul edilir, görünümü değiştirmez.
   */
  centerTitle?: boolean;
  /**
   * Şeffaf varyant (galeri / görsel üstüne bindirme): zemin ve alt çizgi yok. Konumlandırma
   * çağıranın işi (`style` ile `position: 'absolute'`). Yükseklik ve geri oku aynı kalır.
   */
  transparent?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const { colors, spacing, typography, iconSize, minTouchTarget, headerHeight } = theme;

/** Üst bar satır yüksekliği (güvenli alan hariç) — rol token'ı `theme.headerHeight`. */
export const TOP_BAR_HEIGHT = headerHeight;
const ICON_BOX = 40;

/**
 * Yığın ekranlarının üst barı (PageShell'in barı da bu) — uygulamadaki TEK standart: güvenli
 * alan (`useHeaderTopInset`) + SABİT `headerHeight` içerik; surface-elevated zemin, 1px alt
 * çizgi (gölge yok); solda geri oku (chevron-back, 24, başlık rengi, 44pt dokunma alanı), SOLA
 * hizalı tek satır başlık (h3: lg/600, ellipsis), sağda aksiyon slotu. StatusBar koyu içerik
 * ister (kök layout varsayılanı).
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack = true,
  leading,
  titleSlot,
  right,
  transparent = false,
  style,
  testID = 'screen-header',
}) => {
  const topPad = useHeaderTopInset();
  const { t } = useTranslation();

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        transparent && styles.containerTransparent,
        { paddingTop: topPad },
        style,
      ]}
    >
      <View style={styles.row} testID={`${testID}-row`}>
        {leading ? (
          <View style={styles.iconBtn}>{leading}</View>
        ) : showBack ? (
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
        ) : (
          // Geri oku olmasa da aynı boş kutu: başlık her ekranda AYNI x konumunda başlar.
          <View style={styles.iconBtn} />
        )}

        <View style={styles.titleWrap}>
          {titleSlot ?? (
            <>
              <Text variant="h3" numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <RawText style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </RawText>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.rightSlot}>{right}</View>
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
  containerTransparent: {
    backgroundColor: colors.transparent,
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TOP_BAR_HEIGHT,
    gap: spacing[1],
  },
  iconBtn: {
    width: ICON_BOX,
    height: ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radiusRole.button,
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
    justifyContent: 'center',
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
