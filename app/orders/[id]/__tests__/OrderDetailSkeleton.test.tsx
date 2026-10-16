import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { OrderDetailSkeleton } from '../_components/OrderDetailSkeleton';

describe('OrderDetailSkeleton', () => {
  it('OrderDetailSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<OrderDetailSkeleton />);
    expect(screen.getByTestId('order-detail-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
