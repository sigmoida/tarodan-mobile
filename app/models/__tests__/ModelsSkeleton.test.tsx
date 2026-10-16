import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { ModelsSkeleton } from '../_components/ModelsSkeleton';

describe('ModelsSkeleton', () => {
  it('ModelsSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<ModelsSkeleton />);
    expect(screen.getByTestId('models-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
