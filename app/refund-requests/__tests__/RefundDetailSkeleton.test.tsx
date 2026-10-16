import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { RefundDetailSkeleton } from '../_components/RefundDetailSkeleton';

describe('RefundDetailSkeleton', () => {
  it('RefundDetailSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<RefundDetailSkeleton />);
    expect(screen.getByTestId('refund-detail-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
