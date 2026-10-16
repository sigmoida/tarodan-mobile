import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { BusinessApplicationSkeleton } from '../_components/BusinessApplicationSkeleton';

describe('BusinessApplicationSkeleton', () => {
  it('BusinessApplicationSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<BusinessApplicationSkeleton />);
    expect(screen.getByTestId('business-application-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
