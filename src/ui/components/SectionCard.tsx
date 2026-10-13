import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../lib/theme';
import { touchSlop } from './Button';
import { RawText } from './Text';
import { androidRipple, rippleClip, showPressedStyle } from '../lib/pressableFeedback';

import { Icon } from '../icons';
const { colors, radius, radiusRole, spacing, typography, iconSize } = theme;

export interface SectionCardProps {
  /** Başlık. Verilmezse vurgu çubuğu da çizilmez. */
  title?: React.ReactNode;
  /** Başlığın yanında (ör. adet rozeti). */
  badge?: React.ReactNode;
  /** Sağdaki aksiyon — genelde `<SectionCardAction />` ("Tümünü gör ›"). */
  action?: React.ReactNode;
  children?: React.ReactNode;
  /** Kart kabına ek stil (padding burada verilirse varsayılanı ezer). */
  style?: StyleProp<ViewStyle>;
  /** Verilirse çocuklar bu stille bir View'a sarılır. */
  bodyStyle?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Web `@tarodan/ui` SectionCard'ın native karşılığı — uygulamadaki TEK çerçeveli bölüm:
 * `rounded-lg border p-3`, başlıkta 4×24 primary-500 vurgu çubuğu + kalın başlık (web
 * `text-2xl font-bold tracking-tight`), opsiyonel rozet ve sağda aksiyon. Başlık satırı sarar:
 * aksiyon sığmazsa alt satıra iner (web'deki gibi), başlık kısalmaz.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  badge,
  action,
  children,
  style,
  bodyStyle,
  headerStyle,
  testID,
}) => {
  const hasHeader = title != null || action != null || badge != null;
  return (
    <View style={[styles.card, style]} testID={testID}>
      {hasHeader && (
        <View style={[styles.header, headerStyle]}>
          <View style={styles.titleRow}>
            {title != null && <View style={styles.accent} testID="section-card-accent" />}
            {title != null &&
              (typeof title === 'string' || typeof title === 'number' ? (
                <RawText
                  style={styles.title}
                  accessibilityRole="header"
                  maxFontSizeMultiplier={typography.maxFontScale.heading}
                >
                  {title}
                </RawText>
              ) : (
                title
              ))}
            {badge}
          </View>
          {action != null && <View style={styles.action}>{action}</View>}
        </View>
      )}
      {bodyStyle ? <View style={bodyStyle}>{children}</View> : children}
    </View>
  );
};

export interface SectionCardActionProps {
  onPress: () => void;
  /** Varsayılan: "Tümünü gör" (`home.viewAll`). */
  label?: string;
  testID?: string;
}

/** py-1.5 (6) × 2 + text-sm satır yüksekliği (20). */
const ACTION_LINE_HEIGHT = 20;
const ACTION_HEIGHT = spacing[1.5] * 2 + ACTION_LINE_HEIGHT;

/**
 * Web ana sayfa bölümlerindeki "Tümünü gör ›" bağlantısı: `rounded-md border bg-surface-elevated
 * px-3 py-1.5 text-sm font-medium text-body` + 16'lık sağ ok. Dokunma alanı hitSlop ile 44.
 * Basılı: iOS zemin `surface`, Android ripple (köşeye kırpılmış).
 */
export const SectionCardAction: React.FC<SectionCardActionProps> = ({ onPress, label, testID }) => {
  const { t } = useTranslation();
  const text = label ?? t('home.viewAll');
  return (
    <Pressable
      onPress={onPress}
      hitSlop={touchSlop(ACTION_HEIGHT)}
      accessibilityRole="link"
      accessibilityLabel={text}
      testID={testID}
      android_ripple={androidRipple()}
      style={({ pressed }) => [
        styles.actionButton,
        rippleClip(),
        showPressedStyle(pressed) && styles.pressed,
      ]}
    >
      <RawText style={styles.actionText} maxFontSizeMultiplier={typography.maxFontScale.control}>
        {text}
      </RawText>
      <Icon name="chevron-right" size={iconSize.sm} color={colors.text.body} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: radiusRole.section,
    padding: spacing[3],
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing[4],
    rowGap: spacing[2],
    marginBottom: spacing[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flexShrink: 1,
    minWidth: 0,
  },
  accent: {
    width: spacing[1],
    height: spacing[6],
    borderRadius: radius.sm,
    backgroundColor: colors.primary[500],
  },
  title: {
    flexShrink: 1,
    fontSize: typography.fontSize.lg,
    lineHeight: typography.fontSize.lg * typography.lineHeight.snug,
    fontWeight: typography.fontWeight.bold,
    // web `tracking-tight` = -0.025em
    letterSpacing: typography.fontSize.lg * -0.025,
    color: colors.text.heading,
  },
  action: {
    minWidth: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    lineHeight: ACTION_LINE_HEIGHT,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.body,
  },
  pressed: {
    backgroundColor: colors.surface.DEFAULT,
  },
});
