import React from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AVATAR_SIZES,
  SECTION_CARD_METRICS,
  SkeletonAvatar,
  SkeletonBlock,
  SkeletonChatBubble,
  SkeletonLine,
  SkeletonListRow,
  SkeletonSectionCard,
  skeletonLineHeight,
  theme,
} from '@/ui';

const flat = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID, { includeHiddenElements: true }).props.style);

describe('yerleşime sadık iskelet yapı taşları', () => {
  it('SkeletonSectionCard: SectionCard ile aynı çerçeve', () => {
    render(<SkeletonSectionCard testID="sc" action />);
    expect(flat('sc')).toMatchObject({
      borderWidth: SECTION_CARD_METRICS.borderWidth,
      borderRadius: SECTION_CARD_METRICS.radius,
      padding: SECTION_CARD_METRICS.padding,
      backgroundColor: theme.colors.surface.elevated,
    });
  });

  it('SkeletonLine: kutu Text varyantının satır yüksekliğinde', () => {
    const { toJSON } = render(<SkeletonLine variant="bodySm" />);
    const root = toJSON() as unknown as { props: { style: StyleProp<ViewStyle> } };
    expect(StyleSheet.flatten(root.props.style).height).toBe(skeletonLineHeight('bodySm'));
  });

  it('SkeletonAvatar: Avatar ölçeğinden', () => {
    const { toJSON } = render(<SkeletonAvatar size="sm" />);
    const root = toJSON() as unknown as { props: { style: StyleProp<ViewStyle> } };
    expect(StyleSheet.flatten(root.props.style)).toMatchObject({ width: AVATAR_SIZES.sm, height: AVATAR_SIZES.sm });
  });

  it('SkeletonListRow ve SkeletonChatBubble (sol/sağ) çizilir', () => {
    const { toJSON } = render(
      <>
        <SkeletonListRow />
        <SkeletonListRow avatar={false} lines={3} />
        <SkeletonChatBubble side="left" lines={2} />
        <SkeletonChatBubble side="right" />
      </>,
    );
    expect(toJSON()).toBeTruthy();
  });
});

describe('iskelet animasyon türü token’dan (tek sürücü)', () => {
  const cfg = theme.loading.skeleton as { animation: string };
  const original = cfg.animation;
  afterEach(() => {
    cleanup();
    cfg.animation = original;
    jest.restoreAllMocks();
  });

  it('pulse (varsayılan): opaklık animasyonu, parlama şeridi yok', () => {
    render(<SkeletonBlock testID="b" width={100} />);
    expect(flat('b').opacity).toBe(1);
    expect(screen.UNSAFE_queryByType(LinearGradient)).toBeNull();
  });

  it('shimmer: ölçülen genişlikte parlama şeridi, opaklık yok', () => {
    cfg.animation = 'shimmer';
    const loopSpy = jest.spyOn(Animated, 'loop');
    render(<SkeletonBlock testID="b" width={100} />);
    expect(loopSpy).toHaveBeenCalledTimes(1);
    expect(flat('b').opacity).toBeUndefined();
    fireEvent(screen.getByTestId('b', { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 16 } },
    });
    expect(screen.UNSAFE_getByType(LinearGradient)).toBeTruthy();
  });

  it('none: döngü başlamaz', () => {
    cfg.animation = 'none';
    const loopSpy = jest.spyOn(Animated, 'loop');
    render(<SkeletonBlock testID="b" />);
    expect(loopSpy).not.toHaveBeenCalled();
    expect(flat('b').opacity).toBeUndefined();
  });
});
