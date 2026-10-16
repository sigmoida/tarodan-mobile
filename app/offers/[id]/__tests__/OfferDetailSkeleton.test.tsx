import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { OfferDetailSkeleton } from '../_components/OfferDetailSkeleton';

describe('OfferDetailSkeleton', () => {
  it('OfferDetailSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<OfferDetailSkeleton />);
    expect(screen.getByTestId('offer-detail-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
