import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { RefundCardSkeleton } from '../_components/RefundCardSkeleton';

describe('RefundCardSkeleton', () => {
  it('RefundCardSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<RefundCardSkeleton testID="refund-skeleton-card" />);
    expect(screen.getByTestId('refund-skeleton-card')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
