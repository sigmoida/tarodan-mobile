import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { BankAccountSkeleton } from '../_components/BankAccountSkeleton';

describe('BankAccountSkeleton', () => {
  it('BankAccountSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<BankAccountSkeleton />);
    expect(screen.getByTestId('bank-account-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
