import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { TwoFactorSkeleton } from '../_components/TwoFactorSkeleton';

describe('TwoFactorSkeleton', () => {
  it('TwoFactorSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<TwoFactorSkeleton />);
    expect(screen.getByTestId('two-factor-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
