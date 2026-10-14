import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { Icon, type IconName } from '../icons';
import { Text } from './Text';

/**
 * Bilgi / başarı / uyarı / hata kutusu — uygulamadaki TEK mesaj kutusu (web `@tarodan/ui` Alert).
 * Ekranlarda renkli zeminli `View + Icon + Text` kutusu elle çizilmez; "Banner", "Notice", "InfoBox"
 * gibi yerel kutular bunu kullanır.
 *
 * Yapı her varyantta aynı: solda ikon (varyantın varsayılanı, `icon` ile başka bir ad seçilebilir) +
 * isteğe bağlı başlık + metin (+ isteğe bağlı `action` satırı). Dolgu, köşe (`radiusRole.card`) ve
 * 1px çerçeve ortaktır; yalnız renk değişir ve renkler YALNIZ temel paletten gelir:
 * - `info`    → nötr gri (mavi DEĞİL; uygulamada ayrı bir "bilgi mavisi" yok)
 * - `success` → success yeşili
 * - `warning` → warning (amber)
 * - `danger`  → danger kırmızısı
 */
export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  /** Düz metin ya da zengin içerik (metin + bağlantı, liste…). */
  children?: React.ReactNode;
  /** Varsayılan varyant ikonunun yerine başka bir ikon adı (ör. süre uyarısında `clock`). */
  icon?: IconName;
  /** Gövdenin altında (ör. düğmeler). */
  action?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const { colors, radiusRole, spacing, iconSize } = theme;

interface AlertLook {
  bg: string;
  border: string;
  /** Başlık rengi. */
  title: string;
  /** Gövde metni rengi. */
  text: string;
  icon: string;
  iconName: IconName;
}

export const alertLook: Record<AlertVariant, AlertLook> = {
  info: {
    bg: colors.gray[50]!,
    border: colors.border.DEFAULT,
    title: colors.text.heading,
    text: colors.text.body,
    icon: colors.text.muted,
    iconName: 'information-circle',
  },
  success: {
    bg: colors.success[50]!,
    border: colors.success[200]!,
    title: colors.success[800]!,
    text: colors.success[800]!,
    icon: colors.success[600]!,
    iconName: 'check-circle',
  },
  warning: {
    bg: colors.warning[50]!,
    border: colors.warning[200]!,
    title: colors.warning[800]!,
    text: colors.warning[800]!,
    icon: colors.warning[600]!,
    iconName: 'exclamation-triangle',
  },
  danger: {
    bg: colors.danger[50]!,
    border: colors.danger[200]!,
    title: colors.danger[800]!,
    text: colors.danger[800]!,
    icon: colors.danger[600]!,
    iconName: 'exclamation-circle',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  icon,
  action,
  children,
  testID,
  style,
}) => {
  const look = alertLook[variant];
  // Birden çok metin parçası (`{a}{b}`) dizi gelir — hepsi metinse yine <Text> içine sar (RN çıplak metin çöker).
  const plain = React.Children.toArray(children).every((c) => typeof c === 'string' || typeof c === 'number');
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[styles.base, { backgroundColor: look.bg, borderColor: look.border }, style]}
    >
      <View style={styles.icon}>
        <Icon name={icon ?? look.iconName} size={iconSize.md} color={look.icon} />
      </View>
      <View style={styles.body}>
        {title ? (
          <Text variant="bodySm" weight="semibold" color={look.title}>
            {title}
          </Text>
        ) : null}
        {plain ? (
          <Text variant="bodySm" color={look.text}>
            {children}
          </Text>
        ) : (
          children
        )}
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    borderWidth: 1,
    borderRadius: radiusRole.card,
    padding: spacing[4],
  },
  // İkon ilk satırın ortasına otursun (bodySm satır yüksekliği ≈ 20 = iconSize.md).
  icon: { flexShrink: 0 },
  body: { flex: 1, minWidth: 0, gap: spacing[1] },
  action: { marginTop: spacing[2], flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] },
});
