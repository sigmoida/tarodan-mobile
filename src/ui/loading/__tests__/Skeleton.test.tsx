import React from 'react';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { cleanup, render, screen, waitFor } from '@testing-library/react-native';
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

describe('Skeleton paylaşılan nabız', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('N örnek = tek döngü + tek reduce-motion sorgusu/aboneliği; son ayrılan durdurur', () => {
    const stop = jest.fn();
    const start = jest.fn();
    const loopSpy = jest
      .spyOn(Animated, 'loop')
      .mockReturnValue({ start, stop, reset: jest.fn() } as unknown as Animated.CompositeAnimation);
    const query = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const remove = jest.fn();
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);

    const first = render(<SkeletonText lines={6} />);
    const second = render(<SkeletonCard />);
    expect(loopSpy).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);

    first.unmount();
    expect(stop).not.toHaveBeenCalled(); // hâlâ bağlı örnek var
    second.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalled(); // abonelik bırakıldı

    // yeniden bağlanınca döngü tekrar başlar
    render(<Skeleton />);
    expect(loopSpy).toHaveBeenCalledTimes(2);
  });
});
