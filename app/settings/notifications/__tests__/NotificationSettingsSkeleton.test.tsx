import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkeletonBlock } from '@/ui';
import { NotificationSettingsSkeleton } from '../_components/NotificationSettingsSkeleton';

describe('NotificationSettingsSkeleton', () => {
  it('NotificationSettingsSkeleton: çizilir ve yalnız paylaşılan iskelet bloklarından kurulur', () => {
    const { UNSAFE_getAllByType } = render(<NotificationSettingsSkeleton />);
    expect(screen.getByTestId('notification-settings-skeleton')).toBeTruthy();
    expect(UNSAFE_getAllByType(SkeletonBlock).length).toBeGreaterThan(0);
  });
});
