import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { StatusConfig, StatusVariant } from '@/lib/shared';
import { theme } from '../lib/theme';
import { RawText } from './Text';

/**
 * Badge varyantları. Web `@tarodan/ui` Badge'in 5 durum varyantı — `default` (marka tonu),
 * `success`, `warning`, `danger`, `outline` — garanti; paylaşılan sözlüğün fazla adları
 * (`primary`, `secondary`, `info`, `destructive`) çalışmaya devam eder.
 */
export type BadgeVariant = StatusVariant;

/** `soft` (varsayılan) X-100/X-800; `solid` görsel üstü güçlü dolgu (ProductBadge). */
export type BadgeAppearance = 'soft' | 'solid';

export interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  appearance?: BadgeAppearance;
  children?: React.ReactNode;
  /** Etiketin önünde küçük ikon (web `icon`). */
  icon?: React.ReactNode;
  /** Durum modu (web gibi): `config[status]` → etiket + varyant. */
  status?: string;
  config?: Record<string, StatusConfig>;
  /** Çözülen etiketi ezer. */
  label?: React.ReactNode;
  /** Aktif/Pasif ön ayarı: success / outline. `status`'tan önceliklidir. */
  active?: boolean;
  activeLabel?: React.ReactNode;
  passiveLabel?: React.ReactNode;
  /** Etiket metin stili (nadiren; ör. sayaç rozetinde ortalama). */
  textStyle?: React.ComponentProps<typeof RawText>['style'];
}

const { colors, radiusRole, spacing, typography } = theme;

type Look = { bg: string; text: string; border?: string };

const softStyle: Record<BadgeVariant, Look> = {
  // Web: default = bg-primary-100 text-primary-800 (marka tonu).
  default: { bg: colors.primary[100], text: colors.primary[800] },
  primary: { bg: colors.primary[100], text: colors.primary[800] },
  secondary: { bg: colors.gray[100], text: colors.gray[800] },
  success: { bg: colors.success[100], text: colors.success[800] },
  warning: { bg: colors.warning[100], text: colors.warning[800] },
  danger: { bg: colors.danger[100], text: colors.danger[800] },
  info: { bg: colors.info[100], text: colors.info[800] },
  outline: { bg: 'transparent', text: colors.text.body, border: colors.border.DEFAULT },
  // Legacy alias of `danger` (identical styling); kept for cross-platform parity.
  destructive: { bg: colors.danger[100], text: colors.danger[800] },
};

const solidStyle: Record<BadgeVariant, Look> = {
  default: { bg: colors.primary[600], text: colors.text.inverted },
  primary: { bg: colors.primary[600], text: colors.text.inverted },
  secondary: { bg: colors.gray[600], text: colors.text.inverted },
  success: { bg: colors.success[600], text: colors.text.inverted },
  warning: { bg: colors.warning[500], text: colors.text.inverted },
  danger: { bg: colors.danger[600], text: colors.text.inverted },
  info: { bg: colors.info[600], text: colors.text.inverted },
  outline: { bg: colors.surface.DEFAULT, text: colors.text.heading, border: colors.border.DEFAULT },
  destructive: { bg: colors.danger[600], text: colors.text.inverted },
};

/** Web: sm px-2 py-0.5 text-xs · md px-2.5 py-1 text-sm · lg px-3 py-2 text-sm. */
const sizePadding = {
  sm: { px: spacing[2], py: spacing[0.5], font: typography.fontSize.xs },
  md: { px: spacing[2.5], py: spacing[1], font: typography.fontSize.sm },
  lg: { px: spacing[3], py: spacing[2], font: typography.fontSize.sm },
} as const;

export const Badge: React.FC<BadgeProps> = ({
  variant,
  size = 'md',
  appearance = 'soft',
  children,
  icon,
  status,
  config,
  label,
  active,
  activeLabel,
  passiveLabel,
  textStyle,
  style,
  ...rest
}) => {
  const { t } = useTranslation();
  let resolvedVariant: BadgeVariant = variant ?? 'default';
  let content: React.ReactNode = children;

  if (active !== undefined) {
    resolvedVariant = variant ?? (active ? 'success' : 'outline');
    content = label ?? (active ? (activeLabel ?? t('common.active')) : (passiveLabel ?? t('common.inactive')));
  } else if (status !== undefined && config) {
    const entry = config[status];
    resolvedVariant = variant ?? entry?.variant ?? 'outline';
    content = label ?? entry?.label ?? status;
  } else if (label !== undefined) {
    content = label;
  }

  const vs = (appearance === 'solid' ? solidStyle : softStyle)[resolvedVariant];
  const ss = sizePadding[size];
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: vs.bg,
          borderColor: vs.border ?? 'transparent',
          borderWidth: vs.border ? 1 : 0,
          paddingHorizontal: ss.px,
          paddingVertical: ss.py,
        },
        style,
      ]}
      {...rest}
    >
      {icon}
      <RawText
        style={[
          { color: vs.text, fontSize: ss.font, fontWeight: typography.fontWeight.semibold },
          textStyle,
        ]}
      >
        {content}
      </RawText>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radiusRole.badge,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
});
