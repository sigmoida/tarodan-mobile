/**
 * Okundu işareti (web MessageTicks): metin ("✓✓") değil ikon; iletildi = tek tik, okundu =
 * çift tik ve turuncu (primary-300); onay bekleyen / reddedilen durum ikonu alır.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Path } from 'react-native-svg';
import { theme } from '@/ui';
import { MessageTicks } from '../_components/MessageTicks';

describe('MessageTicks', () => {
  it('okundu → çift tik ve turuncu ton', () => {
    render(<MessageTicks status="read" />);
    const tick = screen.getByTestId('message-tick-read');
    expect(screen.UNSAFE_getAllByType(Path)).toHaveLength(2);
    expect(tick.props.stroke).toBe(theme.colors.primary[300]);
  });

  it.each(['sent', 'delivered'] as const)('%s → tek tik (soluk)', (status) => {
    render(<MessageTicks status={status} />);
    const tick = screen.getByTestId('message-tick-sent');
    expect(screen.UNSAFE_getAllByType(Path)).toHaveLength(1);
    expect(tick.props.stroke).toBe(theme.colors.overlay.white70);
  });

  it('onay bekleyen ve reddedilen durumlar ikon alır, metin emojisi yok', () => {
    const { rerender } = render(<MessageTicks status="pending_approval" />);
    expect(screen.getByTestId('message-tick-pending')).toBeTruthy();
    rerender(<MessageTicks status="rejected" />);
    expect(screen.getByTestId('message-tick-rejected')).toBeTruthy();
    expect(screen.queryByText(/✓|⏳|❌/)).toBeNull();
  });
});
