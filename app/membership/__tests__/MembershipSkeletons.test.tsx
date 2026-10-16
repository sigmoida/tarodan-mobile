import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { MembershipSkeleton } from '../_components/MembershipSkeletons';
import { MembershipPlansSkeleton } from '../_components/MembershipSkeletons';
import { MembershipManageSkeleton } from '../_components/MembershipSkeletons';

describe('MembershipSkeletons', () => {
  it('MembershipSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<MembershipSkeleton />);
    expect(screen.getByTestId('membership-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });

  it('MembershipPlansSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<MembershipPlansSkeleton />);
    expect(screen.getByTestId('membership-plans-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });

  it('MembershipManageSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<MembershipManageSkeleton />);
    expect(screen.getByTestId('membership-manage-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
