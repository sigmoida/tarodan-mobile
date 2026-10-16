import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { SkeletonCollectionCard } from '../SkeletonCollectionCard';

describe('SkeletonCollectionCard', () => {
  it('SkeletonCollectionCard: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<SkeletonCollectionCard testID="collection-skeleton-card" />);
    expect(screen.getByTestId('collection-skeleton-card')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
