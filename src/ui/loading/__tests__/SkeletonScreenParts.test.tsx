import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  CHIP_HEIGHT,
  SkeletonBlock,
  SkeletonButton,
  SkeletonButtonRow,
  SkeletonChipTabs,
  SkeletonField,
  SkeletonKeyValueRow,
  SkeletonLine,
  SkeletonMediaRow,
  SkeletonMetricGrid,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonSwitchRow,
  SkeletonTimeline,
  skeletonLineHeight,
  theme,
} from '@/ui';

const flat = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID, { includeHiddenElements: true }).props.style);

describe('ekran iskeleti parçaları', () => {
  it('SkeletonPage: sayfa kenar boşluğu ve kartlar arası boşluk (PageShell ile aynı)', () => {
    render(<SkeletonPage testID="page" />);
    expect(flat('page')).toMatchObject({ padding: theme.spacing[4], gap: theme.spacing[4] });
  });

  it('SkeletonButton: Button asgari yüksekliği ve köşesi', () => {
    render(<SkeletonButton size="lg" />);
    const blocks = screen.UNSAFE_getAllByType(SkeletonBlock);
    expect(blocks[0]!.props.height).toBe(theme.controlHeight.lg);
    expect(blocks[0]!.props.borderRadius).toBe(theme.radiusRole.button);
  });

  it('SkeletonChipTabs: çip yüksekliği Chip ile aynı kaynaktan', () => {
    render(<SkeletonChipTabs count={3} />);
    const blocks = screen.UNSAFE_getAllByType(SkeletonBlock);
    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.props.height === CHIP_HEIGHT.sm)).toBe(true);
  });

  it('SkeletonField: etiket satırı + Input kutusu (controlHeight.md)', () => {
    render(<SkeletonField />);
    const blocks = screen.UNSAFE_getAllByType(SkeletonBlock);
    expect(blocks.some((b) => b.props.height === theme.controlHeight.md)).toBe(true);
  });

  it('SkeletonLine: yeni h1/h2/label varyantları metin satır yüksekliğinde', () => {
    expect(skeletonLineHeight('h2')).toBeCloseTo(theme.typography.fontSize.xl * theme.typography.lineHeight.snug);
    expect(skeletonLineHeight('h1')).toBeCloseTo(theme.typography.fontSize['2xl'] * theme.typography.lineHeight.tight);
    expect(skeletonLineHeight('label')).toBeCloseTo(theme.typography.fontSize.sm * theme.typography.lineHeight.snug);
    render(<SkeletonLine variant="displaySm" />);
  });

  it('diğer parçalar çizilir', () => {
    const { toJSON } = render(
      <>
        <SkeletonButtonRow />
        <SkeletonKeyValueRow />
        <SkeletonMediaRow />
        <SkeletonMetricGrid count={3} centered />
        <SkeletonPageHeader lines={2} />
        <SkeletonTimeline steps={3} />
        <SkeletonSwitchRow />
      </>,
    );
    expect(toJSON()).toBeTruthy();
  });
});
