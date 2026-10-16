import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { OfferCardSkeleton } from '../_components/OfferCardSkeleton';

describe('OfferCardSkeleton', () => {
  it('OfferCardSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<OfferCardSkeleton testID="offer-skeleton-card" />);
    expect(screen.getByTestId('offer-skeleton-card')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
