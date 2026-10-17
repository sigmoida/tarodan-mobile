import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { SkeletonTradeCard } from '../SkeletonTradeCard';

describe('SkeletonTradeCard', () => {
  it('SkeletonTradeCard: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<SkeletonTradeCard testID="trade-skeleton-card" />);
    expect(screen.getByTestId('trade-skeleton-card')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
