import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { theme } from '../lib/theme';
import { PAGE_GUTTER } from '../lib/pageLayout';
import { RefIcon, type IconRef } from '../icons';

export interface EmptyStateProps {
  /** Icon: REQUIRED (every empty state has the same skeleton: grey circle + icon). */
  icon: IconRef;
  title: string;
  /** Subtitle: REQUIRED (an empty state says what happened and what the user can do). */
  subtitle: string;
  /** Primary action (optional). */
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Ready-made action node (custom body of gate screens); drawn together with `actionLabel`/`onAction` too. */
  action?: React.ReactNode;
  /**
   * Placement (the spacing lives INSIDE the component; the caller adds no padding or margin):
   * - `screen` (default): screen level, 64 pt from the top of a content area without a gutter
   *   (`PageShell` `empty`, an AppShell child, a list without a gutter).
   * - `list`: the `ListEmptyComponent` of a list on `pageListContentStyle`; the list gutter is
   *   part of the offset, so it lands exactly where `screen` does.
   * - `inline`: inside a card, modal or section; compact (24 top, 8 bottom, 48 pt circle).
   */
  placement?: EmptyStatePlacement;
  testID?: string;
}

export type EmptyStatePlacement = 'screen' | 'list' | 'inline';

const { colors, spacing, radiusRole } = theme;

/**
 * Empty state metrics: ONE shape (ErrorState uses the same skeleton).
 *
 * PLACEMENT RULE (the same everywhere): a fixed top offset (`EMPTY_STATE_TOP_OFFSET`, 64 pt) from
 * the top of the content area, centred horizontally, 16 pt from the screen edges. No vertical
 * centring: centring depends on the container height (tab bar, keyboard, header band, list header)
 * and would drift from screen to screen. `PageShell` `empty` and a list's first-item
 * `ListEmptyComponent` (`list`, which subtracts the `pageListContentStyle` gutter it already sits
 * in) therefore land in the same place. The placement lives IN the component,
 * so the caller adds no padding, margin or flex (lint: `tarodan/empty-state-standard`).
 */
export const EMPTY_STATE_TOP_OFFSET = spacing[16];
const SCREEN_SIDE_PADDING = spacing[4];
const SCREEN_BOTTOM_PADDING = spacing[8];
export const emptyStateMetrics = {
  screen: {
    circle: 64,
    icon: 28,
    paddingTop: EMPTY_STATE_TOP_OFFSET,
    paddingBottom: SCREEN_BOTTOM_PADDING,
    paddingHorizontal: SCREEN_SIDE_PADDING,
  },
  list: {
    circle: 64,
    icon: 28,
    paddingTop: EMPTY_STATE_TOP_OFFSET - PAGE_GUTTER,
    paddingBottom: SCREEN_BOTTOM_PADDING - PAGE_GUTTER,
    paddingHorizontal: SCREEN_SIDE_PADDING - PAGE_GUTTER,
  },
  inline: {
    circle: 48,
    icon: 24,
    paddingTop: spacing[6],
    paddingBottom: spacing[2],
    paddingHorizontal: SCREEN_SIDE_PADDING,
  },
} as const;

interface StateLayoutProps {
  icon: IconRef;
  title: string;
  description?: string;
  placement?: EmptyStatePlacement;
  testID?: string;
  children?: React.ReactNode;
}

/** Shared skeleton: grey circle + grey icon, title lg/600, description sm muted, actions mt-4. */
export const StateLayout: React.FC<StateLayoutProps> = ({
  icon,
  title,
  description,
  placement = 'screen',
  testID = 'empty-state',
  children,
}) => {
  const m = emptyStateMetrics[placement];
  return (
    <View
      style={[
        styles.container,
        { paddingTop: m.paddingTop, paddingBottom: m.paddingBottom, paddingHorizontal: m.paddingHorizontal },
      ]}
      testID={testID}
    >
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
  placement,
  testID,
}) => {
  const hasActions = !!action || !!(actionLabel && onAction) || !!(secondaryLabel && onSecondary);
  return (
    <StateLayout icon={icon} title={title} description={subtitle} placement={placement} testID={testID}>
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
  // Button defaults to alignSelf: 'flex-start'; centre it with the content.
  button: { alignSelf: 'center' },
});
