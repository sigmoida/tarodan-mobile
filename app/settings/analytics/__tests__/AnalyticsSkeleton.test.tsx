import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { AnalyticsSkeleton } from '../_components/AnalyticsSkeleton';

describe('AnalyticsSkeleton', () => {
  it('AnalyticsSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<AnalyticsSkeleton />);
    expect(screen.getByTestId('analytics-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
