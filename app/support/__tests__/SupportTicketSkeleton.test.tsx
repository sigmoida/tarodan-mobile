import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { SupportTicketSkeleton } from '../_components/SupportTicketSkeleton';

describe('SupportTicketSkeleton', () => {
  it('SupportTicketSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<SupportTicketSkeleton />);
    expect(screen.getByTestId('support-ticket-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
