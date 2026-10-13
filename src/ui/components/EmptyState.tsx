import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { theme } from '../lib/theme';
import { RefIcon, type IconRef } from '../icons';

export interface EmptyStateProps {
  /** İkon adı; `false` ikonsuz çizer (web `icon={false}`). */
  icon?: IconRef | false;
  title: string;
  subtitle?: string;
  /** `subtitle` için web adı. */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Hazır aksiyon düğümü (web `action`); `actionLabel`/`onAction` yerine. */
  action?: React.ReactNode;
  /** Web: `default` geniş boşluk, `compact` kart içi. */
  size?: 'default' | 'compact';
  fullscreen?: boolean;
}

const { colors, spacing, radiusRole } = theme;

/** Web `@tarodan/ui` EmptyState ölçüleri — ErrorState de aynı iskeleti kullanır. */
export const emptyStateMetrics = {
  default: { circle: 64, icon: 28, py: spacing[16] },
  compact: { circle: 48, icon: 24, py: spacing[8] },
} as const;

interface StateLayoutProps {
  icon: IconRef | false;
  title: string;
  description?: string;
  size: 'default' | 'compact';
  fullscreen: boolean;
  children?: React.ReactNode;
}

/** Ortak iskelet: gri daire + gri ikon, başlık lg/600, açıklama sm muted, aksiyon mt-4. */
export const StateLayout: React.FC<StateLayoutProps> = ({
  icon,
  title,
  description,
  size,
  fullscreen,
  children,
}) => {
  const m = emptyStateMetrics[size];
  return (
    <View style={[styles.container, { paddingVertical: m.py }, fullscreen && styles.fullscreen]}>
      {icon !== false ? (
        <View style={[styles.iconCircle, { width: m.circle, height: m.circle }]}>
          <RefIcon icon={icon} size={m.icon} color={colors.text.subtle} />
        </View>
      ) : null}
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
  icon = 'inbox',
  title,
  subtitle,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  action,
  size = 'default',
  fullscreen = false,
}) => {
  const hasActions = !!action || !!(actionLabel && onAction) || !!(secondaryLabel && onSecondary);
  return (
    <StateLayout
      icon={icon}
      title={title}
      description={description ?? subtitle}
      size={size}
      fullscreen={fullscreen}
    >
      {hasActions ? (
        <>
          {action}
          {actionLabel && onAction ? (
            <Button variant="primary" title={actionLabel} onPress={onAction} style={styles.button} />
          ) : null}
          {secondaryLabel && onSecondary ? (
            <Button variant="ghost" title={secondaryLabel} onPress={onSecondary} style={styles.button} />
          ) : null}
        </>
      ) : null}
    </StateLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  fullscreen: { flex: 1 },
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
