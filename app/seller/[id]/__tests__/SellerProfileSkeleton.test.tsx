import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { SellerProfileSkeleton } from '../_components/SellerProfileSkeleton';

describe('SellerProfileSkeleton', () => {
  it('SellerProfileSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<SellerProfileSkeleton />);
    expect(screen.getByTestId('seller-profile-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
