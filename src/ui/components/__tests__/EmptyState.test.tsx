import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EmptyState, ErrorState, theme } from '@/ui';

/** SVG kökü `backgroundColor: transparent` taşır — dolu zemin arıyoruz. */
const isFilled = (c?: unknown) => !!c && c !== 'transparent';

describe('EmptyState / ErrorState (web @tarodan/ui)', () => {
  it('gri daire içinde gri ikon, başlık lg/600, açıklama sm muted', () => {
    render(<EmptyState icon="heart" title="Favori yok" subtitle="Beğendiklerin burada" />);
    const icon = screen.getByTestId('icon-heart');
    expect(icon.props.stroke).toBe(theme.colors.text.subtle);
    let circle: typeof icon | null = icon.parent;
    while (circle && !isFilled(StyleSheet.flatten(circle.props.style)?.backgroundColor)) circle = circle.parent;
    expect(StyleSheet.flatten(circle?.props.style)).toMatchObject({
      width: 64,
      height: 64,
      backgroundColor: theme.colors.surface.alt,
    });
    expect(StyleSheet.flatten(screen.getByText('Favori yok').props.style)).toMatchObject({
      fontSize: 18,
      fontWeight: '600',
    });
    expect(StyleSheet.flatten(screen.getByText('Beğendiklerin burada').props.style)).toMatchObject({
      fontSize: 14,
      color: theme.colors.text.muted,
    });
  });

  it('mevcut API: actionLabel + onAction çalışır; icon={false} ikonsuz', () => {
    const onAction = jest.fn();
    render(<EmptyState icon={false} title="Boş" actionLabel="Keşfet" onAction={onAction} />);
    expect(screen.queryByTestId(/^icon-/)).toBeNull();
    fireEvent.press(screen.getByText('Keşfet'));
    expect(onAction).toHaveBeenCalled();
  });

  it('ErrorState varsayılan metinler + tekrar dene', () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalled();
  });
});
