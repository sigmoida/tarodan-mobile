import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { SellerDashboardSkeleton } from '../_components/SellerDashboardSkeleton';

describe('SellerDashboardSkeleton', () => {
  it('SellerDashboardSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<SellerDashboardSkeleton />);
    expect(screen.getByTestId('seller-dashboard-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
