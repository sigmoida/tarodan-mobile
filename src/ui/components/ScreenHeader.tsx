import React, { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RawText, Text } from './Text';
import { GlassIconButton, GLASS_ICON_BUTTON_SIZE } from './GlassIconButton';
import { GlassSurface } from './GlassSurface';
import { ScrollEdge } from './ScrollEdge';
import { getGlassView } from '../lib/glass';
import { theme } from '../lib/theme';
import { useHeaderTopInset } from '../lib/header';

import type { IconRef, IconVariant } from '../icons';
/**
 * @deprecated Eski turuncu/açık ayrımı. Yığın ekranlarının üst barı artık TEK görünüm: yüzen cam
 * butonlu, ortalı başlıklı bar. Prop geriye uyum için kabul edilir, görünümü değiştirmez.
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
   * Geri okunun yerine özel öncül düğüm (ör. kapat X). Sol slotta (44pt kutu) çizilir; verilirse
   * `showBack`/`onBack` yok sayılır.
   */
  leading?: React.ReactNode;
  /** Başlık + alt başlık yerine özel içerik (ör. sohbet: avatar + ad + ürün). Ortada, tek satır sığmalı. */
  titleSlot?: React.ReactNode;
  /**
   * `titleSlot` kalan genişliği DOLDURSUN (ör. arama ekranı: geri oku + header'da arama alanı). Yan
   * slotlar eşit ayrılmaz (ortalama yok): sol slot içeriği kadar, sağ slot yalnız `right` varsa.
   */
  titleFill?: boolean;
  /**
   * Sağ aksiyon(lar): `TopBarAction` (ikon = cam daire, metin = cam hap). Birden çok aksiyon
   * fragment olarak verilir; aralarındaki boşluğu bar koyar.
   */
  right?: React.ReactNode;
  /** @deprecated Başlık HER ZAMAN ortalı. Prop geriye uyum için kabul edilir, görünümü değiştirmez. */
  centerTitle?: boolean;
  /**
   * Şeffaf varyant (galeri / görsel üstüne bindirme): kenar şeridi ve zemin yok. Konumlandırma
   * çağıranın işi (`style` ile `position: 'absolute'`); bu kipte bar yüzen DEĞİLDİR.
   */
  transparent?: boolean;
  /**
   * `true` (varsayılan): bar içeriğin ÜSTÜNDE yüzer (absolute, zeminsiz; altında kaydırma kenarı
   * şeridi). İçerik bar altından başlar — `PageShell`/`AppShell` üst boşluğu kendisi verir.
   * `false`: bar akışta, opak beyaz zeminli (özel kabuklar: sohbet başlığı, ödeme, WebView, kapılar).
   */
  floating?: boolean;
  /**
   * Kaydırma kenarı sinyali (bkz. `usePageScrollHandler`). Yoksa şerit SABİT hafif beyazdır.
   * Yalnız `floating` iken anlamlı.
   */
  scrollY?: SharedValue<number>;
  style?: ViewStyle;
  testID?: string;
}

const { colors, spacing, headerHeight, headerBottomPad } = theme;

/** Üst bar satır yüksekliği (güvenli alan hariç) — rol token'ı `theme.headerHeight`. */
export const TOP_BAR_HEIGHT = headerHeight;
const SIDE_MIN = GLASS_ICON_BUTTON_SIZE;
/** Bir yan slotun azami genişliği (pencere genişliğinin oranı): uzun metin aksiyonu başlığı ezmesin. */
const SIDE_MAX_RATIO = 0.36;
/**
 * Başlıksız barda (ezilecek başlık yok) yan slotun azami oranı: ürün/koleksiyon detayı gibi üç cam
 * düğmeli sağ grup (3 × 44 + 2 × 8 = 148pt) dar ekranda da sığar.
 */
const SIDE_MAX_RATIO_NO_TITLE = 0.5;
/** Metin aksiyonu hapının yüksekliği; 44pt dokunma alanı `hitSlop` ile tamamlanır. */
const PILL_HEIGHT = theme.controlHeight.md;
const PILL_HIT_SLOP = (theme.minTouchTarget - PILL_HEIGHT) / 2;

/**
 * Yığın ekranlarının üst barı (PageShell'in barı da bu) — uygulamadaki TEK standart (Storytel
 * düzeni): içeriğin ÜSTÜNDE yüzen, zeminsiz bar. Solda geri oku `GlassIconButton` (cam daire,
 * chevron-left; geri oku yoksa sol boş), ortada ORTALI tek satır başlık (h3 bold, ellipsis), sağda
 * aksiyonlar (`TopBarAction`: ikon = cam daire, metin = cam hap). Yan slotlar EŞİT genişlikte
 * ayrılır (ikisinin geniş olanı) ki başlık gerçekten ortada kalsın. Altında kaydırma kenarı
 * (`ScrollEdge`) durum çubuğu bölgesini de kapsar. StatusBar koyu içerik (kök layout varsayılanı).
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack = true,
  leading,
  titleSlot,
  titleFill = false,
  right,
  transparent = false,
  floating = true,
  scrollY,
  style,
  testID = 'screen-header',
}) => {
  const topPad = useHeaderTopInset();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const [leftW, setLeftW] = useState(0);
  const [rightW, setRightW] = useState(0);
  const isFloating = floating && !transparent;
  const noTitle = !title && !subtitle && !titleSlot;
  const sideRatio = noTitle ? SIDE_MAX_RATIO_NO_TITLE : SIDE_MAX_RATIO;
  const sideW = Math.min(Math.max(leftW, rightW, SIDE_MIN), Math.max(SIDE_MIN, windowWidth * sideRatio));
  const onLeftLayout = (e: LayoutChangeEvent) => setLeftW(Math.ceil(e.nativeEvent.layout.width));
  const onRightLayout = (e: LayoutChangeEvent) => setRightW(Math.ceil(e.nativeEvent.layout.width));

  return (
    <View
      testID={testID}
      pointerEvents={isFloating ? 'box-none' : 'auto'}
      style={[
        styles.container,
        isFloating && styles.floating,
        !isFloating && !transparent && styles.solid,
        { paddingTop: topPad },
        style,
      ]}
    >
      {isFloating ? (
        <ScrollEdge barHeight={topPad + TOP_BAR_HEIGHT + headerBottomPad} scrollY={scrollY} testID={`${testID}-edge`} />
      ) : null}
      <View style={styles.row} testID={`${testID}-row`} pointerEvents="box-none">
        {/* Boş yan slotlar dokunuşu yutmasın (alttaki listenin sürüklenmesi): box-none. */}
        <View style={[styles.side, !titleFill && { width: sideW }]} testID={`${testID}-left`} pointerEvents="box-none">
          <View style={styles.sideInner} onLayout={onLeftLayout} pointerEvents="box-none">
            {leading ? (
              <View style={styles.leadingBox} pointerEvents="box-none">{leading}</View>
            ) : showBack ? (
              <GlassIconButton
                icon="chevron-left"
                onPress={onBack ?? NOOP_PRESS}
                disabled={!onBack}
                accessibilityLabel={t('common.back')}
                testID={`${testID}-back`}
              />
            ) : null}
          </View>
        </View>

        <View style={[styles.titleWrap, titleFill && styles.titleFill]} pointerEvents="box-none">
          {titleSlot ?? (
            <>
              <Text variant="h3" weight="bold" align="center" numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <RawText
                  style={styles.subtitle}
                  numberOfLines={1}
                  maxFontSizeMultiplier={theme.typography.maxFontScale.control}
                >
                  {subtitle}
                </RawText>
              ) : null}
            </>
          )}
        </View>

        {titleFill && !right ? null : (
          <View
            style={[styles.side, styles.sideRight, !titleFill && { width: sideW }]}
            testID={`${testID}-right`}
            pointerEvents="box-none"
          >
            <View style={[styles.sideInner, styles.rightInner]} onLayout={onRightLayout} pointerEvents="box-none">
              {right}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// Geri işleyicisi yokken düğme devre dışı; GlassIconButton `onPress` ister.
const NOOP_PRESS = () => undefined;

export interface TopBarActionProps {
  /** İkon (cam daire, başlık renginde, 24) ya da kısa metin aksiyonu ("Kaydet": cam hap). */
  icon?: IconRef;
  iconVariant?: IconVariant;
  label?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** İkonun üstünde sayaç rozeti (danger-500). */
  count?: number;
  testID?: string;
}

/**
 * Üst barın sağ aksiyonu. İkonlu: `GlassIconButton` (cam daire, 44pt). Metinli: `GlassSurface`
 * hap içinde primary-600 / 600 ağırlık metin; hap yüksekliği 40, dokunma alanı 44'e `hitSlop` ile
 * tamamlanır. Native cam ata `opacity < 1` iken efektini kaybeder: pasif görünüm yalnız metne.
 */
export const TopBarAction: React.FC<TopBarActionProps> = ({
  icon,
  iconVariant,
  label,
  onPress,
  accessibilityLabel,
  disabled,
  count,
  testID,
}) =>
  icon ? (
    <GlassIconButton
      icon={icon}
      iconVariant={iconVariant}
      accessibilityLabel={accessibilityLabel ?? label ?? icon}
      onPress={onPress}
      count={count}
      disabled={disabled}
      testID={testID}
    />
  ) : (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      hitSlop={PILL_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.pillBox, pressed && !getGlassView() && styles.pressed]}
    >
      <TopBarPill disabled={disabled}>{label}</TopBarPill>
    </Pressable>
  );

/** Salt gösterim cam hap (sayaç gibi dokunulmayan değerler): `blocked-users` sayısı vb. */
export const TopBarLabel: React.FC<{ children: React.ReactNode; testID?: string }> = ({ children, testID }) => (
  <View testID={testID} style={styles.pillBox}>
    <TopBarPill>{children}</TopBarPill>
  </View>
);

const TopBarPill: React.FC<{ children: React.ReactNode; disabled?: boolean }> = ({ children, disabled }) => (
  <GlassSurface shape="pill" size={PILL_HEIGHT} pointerEvents="none" style={styles.pill}>
    <RawText
      numberOfLines={1}
      maxFontSizeMultiplier={theme.typography.maxFontScale.control}
      style={[styles.textAction, disabled && styles.disabled]}
    >
      {children}
    </RawText>
  </GlassSurface>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[3],
    // Satırın altında `headerBottomPad`: durum çubuğu ↔ düğme boşluğuyla dengeli alt boşluk.
    paddingBottom: headerBottomPad,
  },
  // İçeriğin ÜSTÜNDE yüzer; boş alanlardan dokunuşlar içeriğe geçer (box-none).
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  solid: {
    backgroundColor: colors.surface.elevated,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TOP_BAR_HEIGHT,
    gap: spacing[1],
  },
  // Yan slotlar satır yönünde: içerik doğal genişliğinde (flexShrink 0) ölçülür, taşma görünür.
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  sideInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  rightInner: {
    gap: spacing[2],
  },
  leadingBox: {
    width: SIDE_MIN,
    height: SIDE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Doldur modu: özel içerik satırın kalan genişliğine yayılır; geri okuyla arası ana sayfa barıyla
  // aynı (row gap 4 + 4 = 8).
  titleFill: {
    alignItems: 'stretch',
    marginLeft: spacing[1],
  },
  subtitle: {
    marginTop: spacing[0.5],
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.muted,
    textAlign: 'center',
  },
  pillBox: {
    height: PILL_HEIGHT,
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: spacing[4],
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  textAction: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.primary[600],
  },
});
