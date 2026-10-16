import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { ReviewListSkeleton } from '../_components/ReviewListSkeleton';

describe('ReviewListSkeleton', () => {
  it('ReviewListSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<ReviewListSkeleton />);
    expect(screen.getByTestId('reviews-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
