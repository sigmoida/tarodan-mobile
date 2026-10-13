import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { HeaderIconButton, theme } from '@/ui';

describe('HeaderIconButton — ortak üst bar ikon düğmesi', () => {
  it('44pt dokunma kutusu, zeminsiz, etiket + testID; basınca onPress', () => {
    const onPress = jest.fn();
    render(<HeaderIconButton icon="cart-outline" label="Sepet" testID="btn" onPress={onPress} />);
    const btn = screen.getByTestId('btn');
    expect(btn.props.accessibilityLabel).toBe('Sepet');
    const style = StyleSheet.flatten(
      typeof btn.props.style === 'function' ? btn.props.style({ pressed: false }) : btn.props.style,
    );
    expect(style).toMatchObject({ width: theme.minTouchTarget, height: theme.minTouchTarget });
    expect(style.backgroundColor).toBeUndefined();
    fireEvent.press(btn);
    expect(onPress).toHaveBeenCalled();
  });

  it('tone=muted: ikon theme.inactiveIconColor (alt menü pasif grisi); rozet danger kalır', () => {
    render(<HeaderIconButton icon="bell" label="Bildirim" tone="muted" count={2} onPress={jest.fn()} />);
    expect(screen.getByTestId('icon-bell').props.stroke).toBe(theme.inactiveIconColor);
    expect(theme.inactiveIconColor).toBe(theme.colors.text.subtle);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('sayaç rozeti: 0 çizilmez, 99 üstü "99+"', () => {
    const { rerender } = render(<HeaderIconButton icon="cart-outline" label="Sepet" onPress={jest.fn()} count={0} />);
    expect(screen.queryByText('0')).toBeNull();
    rerender(<HeaderIconButton icon="cart-outline" label="Sepet" onPress={jest.fn()} count={120} />);
    expect(screen.getByText('99+')).toBeTruthy();
  });
});
