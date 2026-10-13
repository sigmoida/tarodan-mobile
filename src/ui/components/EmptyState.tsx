import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { theme } from '../lib/theme';
import { RefIcon, type IconRef } from '../icons';

export interface EmptyStateProps {
  /** Ikon adı — ZORUNLU (her boş durum aynı iskeleti: gri daire + ikon). */
  icon: IconRef;
  title: string;
  /** Alt başlık — ZORUNLU (boş durum "ne oldu + ne yapabilirim" der). */
  subtitle: string;
  /** Birincil eylem (opsiyonel). */
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Hazır aksiyon düğümü (kapı ekranlarının özel gövdesi); `actionLabel`/`onAction` ile birlikte de çizilir. */
  action?: React.ReactNode;
}

const { colors, spacing, radiusRole } = theme;

/**
 * Boş durum ölçüleri — TEK tip (ErrorState de aynı iskeleti kullanır).
 *
 * YERLEŞİM KURALI (hepsinde aynı): içerik alanının ÜSTÜNDEN sabit `paddingTop` ofseti
 * (`EMPTY_STATE_TOP_OFFSET`, 64pt) ile, yatayda ortalı. Dikey ortalama YOK: ortalama kapsayıcı
 * yüksekliğine (sekme çubuğu, klavye, başlık bandı, liste başlığı) bağlı olduğundan ekrandan
 * ekrana kayardı; sabit ofset her yerde — PageShell `empty`, liste `ListEmptyComponent`, kart
 * içi — aynı yerde durur. Yerleşim bileşenin KENDİSİNDE olduğu için çağıran ek
 * padding/margin/flex vermez (lint: `tarodan/empty-state-standard`).
 */
export const EMPTY_STATE_TOP_OFFSET = spacing[16];
export const emptyStateMetrics = {
  circle: 64,
  icon: 28,
  paddingTop: EMPTY_STATE_TOP_OFFSET,
  paddingBottom: spacing[8],
} as const;

interface StateLayoutProps {
  icon: IconRef;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Ortak iskelet: gri daire + gri ikon, başlık lg/600, açıklama sm muted, aksiyon mt-4. */
export const StateLayout: React.FC<StateLayoutProps> = ({ icon, title, description, children }) => {
  const m = emptyStateMetrics;
  return (
    <View style={styles.container} testID="empty-state">
      <View style={[styles.iconCircle, { width: m.circle, height: m.circle }]}>
        <RefIcon icon={icon} size={m.icon} color={colors.text.subtle} />
      </View>
      <Text variant="h3" weight="semibold" align="center" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="bodySm" tone="muted" align="center" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  action,
}) => {
  const hasActions = !!action || !!(actionLabel && onAction) || !!(secondaryLabel && onSecondary);
  return (
    <StateLayout icon={icon} title={title} description={subtitle}>
      {hasActions ? (
        <>
          {action}
          {actionLabel && onAction ? (
            <Button variant="primary" size="md" title={actionLabel} onPress={onAction} style={styles.button} />
          ) : null}
          {secondaryLabel && onSecondary ? (
            <Button variant="ghost" size="md" title={secondaryLabel} onPress={onSecondary} style={styles.button} />
          ) : null}
        </>
      ) : null}
    </StateLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: emptyStateMetrics.paddingTop,
    paddingBottom: emptyStateMetrics.paddingBottom,
    paddingHorizontal: spacing[4],
  },
  iconCircle: {
    borderRadius: radiusRole.avatar,
    backgroundColor: colors.surface.alt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: { marginBottom: spacing[1] },
  // Web `max-w-sm` (384).
  description: { maxWidth: 384 },
  actions: { marginTop: spacing[4], alignItems: 'center', gap: spacing[2] },
  // Button varsayılan alignSelf:'flex-start' kullanır; ortalı içeriğe hizala.
  button: { alignSelf: 'center' },
});
