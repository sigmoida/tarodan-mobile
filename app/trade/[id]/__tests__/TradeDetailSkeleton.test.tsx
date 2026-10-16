import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { TradeDetailSkeleton } from '../_components/TradeDetailSkeleton';

describe('TradeDetailSkeleton', () => {
  it('TradeDetailSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<TradeDetailSkeleton />);
    expect(screen.getByTestId('trade-detail-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
