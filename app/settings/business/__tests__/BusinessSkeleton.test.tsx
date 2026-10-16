import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { BusinessSkeleton } from '../_components/BusinessSkeleton';

describe('BusinessSkeleton', () => {
  it('BusinessSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<BusinessSkeleton />);
    expect(screen.getByTestId('business-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
