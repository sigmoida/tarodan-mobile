import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { EMPTY_STATE_TOP_OFFSET, EmptyState, ErrorState, PageShell, theme } from '@/ui';

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
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
    });
    expect(StyleSheet.flatten(screen.getByText('Beğendiklerin burada').props.style)).toMatchObject({
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.muted,
    });
  });

  it('ikon + başlık + alt başlık her zaman çizilir; eylem opsiyonel (actionLabel + onAction)', () => {
    const onAction = jest.fn();
    const { rerender } = render(<EmptyState icon="inbox" title="Boş" subtitle="Açıklama" />);
    expect(screen.getByTestId('icon-inbox')).toBeTruthy();
    expect(screen.getByText('Açıklama')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<EmptyState icon="inbox" title="Boş" subtitle="Açıklama" actionLabel="Keşfet" onAction={onAction} />);
    fireEvent.press(screen.getByText('Keşfet'));
    expect(onAction).toHaveBeenCalled();
  });

  it('yerleşim kuralı: üstten sabit ofset, yatay ortalı; dikey ortalama / flex yok', () => {
    render(<EmptyState icon="inbox" title="Boş" subtitle="Açıklama" />);
    const style = StyleSheet.flatten(screen.getByTestId('empty-state').props.style);
    expect(style).toMatchObject({ paddingTop: EMPTY_STATE_TOP_OFFSET, alignItems: 'center' });
    expect(style.justifyContent).toBeUndefined();
    expect(style.flex).toBeUndefined();
  });

  it('PageShell empty ve liste ListEmptyComponent AYNI yerleşimi kullanır', () => {
    const props = { icon: 'inbox' as const, title: 'Boş', subtitle: 'Açıklama' };
    const shell = render(<PageShell title="X" empty emptyState={props} />);
    const a = StyleSheet.flatten(shell.getByTestId('empty-state').props.style);
    shell.unmount();
    const list = render(<FlatList data={[]} renderItem={() => null} ListEmptyComponent={<EmptyState {...props} />} />);
    const b = StyleSheet.flatten(list.getByTestId('empty-state').props.style);
    expect(b).toEqual(a);
  });

  it('ErrorState varsayılan metinler + tekrar dene', () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalled();
  });
});
