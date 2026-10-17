import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { AddressesSkeleton } from '../_components/AddressesSkeleton';
import { AddressFormSkeleton } from '../_components/AddressesSkeleton';

describe('AddressesSkeleton', () => {
  it('AddressesSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<AddressesSkeleton />);
    expect(screen.getByTestId('addresses-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });

  it('AddressFormSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<AddressFormSkeleton />);
    expect(screen.getByTestId('address-form-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
