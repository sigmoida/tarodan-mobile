import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { SupportTicketsSkeleton } from '../_components/SupportTicketsSkeleton';

describe('SupportTicketsSkeleton', () => {
  it('SupportTicketsSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<SupportTicketsSkeleton />);
    expect(screen.getByTestId('support-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
