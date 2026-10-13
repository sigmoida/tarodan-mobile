import React from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { StatusConfig, WebStatusVariant } from '@/lib/shared';
import { theme } from '../lib/theme';
import { RawText } from './Text';
import { Pill, pillTextStyle } from './Pill';

/**
 * Badge varyantları. Web `@tarodan/ui` Badge'in 5 durum varyantı — `default` (marka tonu),
 * `success`, `warning`, `danger`, `outline` (`WebStatusVariant`, durum haritalarının tek
 * sözlüğü) — garanti. Mobilin eski fazla adları (`primary`, `secondary`, `info`,
 * `destructive`) yalnız rozet görünümü olarak burada yaşar ve çalışmaya devam eder; durum
 * haritalarında kullanılmaz. (`@/lib/shared` `StatusVariant` artık gerekmez.)
 */
export type BadgeVariant = WebStatusVariant | 'primary' | 'secondary' | 'info' | 'destructive';

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

const { colors } = theme;

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
  return (
    <Pill
      size={size}
      shape="badge"
      background={vs.bg}
      borderColor={vs.border}
      icon={icon}
      style={[styles.base, style]}
      {...rest}
    >
      <RawText numberOfLines={1} style={[pillTextStyle(size, vs.text), styles.label, textStyle]}>
        {content}
      </RawText>
    </Pill>
  );
};

const styles = StyleSheet.create({
  // Uzun etiket (kampanya/durum metni) rozeti büyütmez: tek satır, taşarsa ellipsis.
  base: { alignSelf: 'flex-start', maxWidth: '100%' },
  label: { flexShrink: 1 },
});
