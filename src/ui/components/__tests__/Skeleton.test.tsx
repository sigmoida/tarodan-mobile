import React from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Skeleton, SkeletonAvatar, SkeletonCard, SkeletonText, theme } from '@/ui';

describe('Skeleton (web @tarodan/ui)', () => {
  it('bg-border-subtle, rounded-md, erişilebilirlikten gizli', () => {
    render(<Skeleton testID="sk" width={120} />);
    const node = screen.getByTestId('sk', { includeHiddenElements: true });
    expect(StyleSheet.flatten(node.props.style)).toMatchObject({
      width: 120,
      height: 16,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.border.subtle,
    });
  });

  it('kalıplar çizilir', () => {
    const { toJSON } = render(
      <>
        <SkeletonText lines={2} />
        <SkeletonCard />
        <SkeletonAvatar size="lg" />
      </>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('Hareketi azalt açıkken sabit kalır', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    render(<Skeleton testID="sk" />);
    await waitFor(() =>
      expect(
        StyleSheet.flatten(screen.getByTestId('sk', { includeHiddenElements: true }).props.style).opacity,
      ).toBe(1),
    );
    spy.mockRestore();
  });
});
