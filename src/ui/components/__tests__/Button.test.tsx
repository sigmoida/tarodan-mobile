import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, theme } from '@/ui';
import { touchSlop } from '../Button';

const buttonStyle = () => {
  const btn = screen.getByRole('button');
  const style = btn.props.style;
  return StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style);
};

describe('Button (web @tarodan/ui ölçüleri)', () => {
  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 48],
    ['xl', 56],
  ] as const)('%s yüksekliği %i', (size, height) => {
    render(<Button size={size} title="Kaydet" />);
    expect(buttonStyle().height).toBe(height);
    expect(buttonStyle().borderRadius).toBe(theme.radius.lg);
  });

  it('primary = primary-600, etiket 500 ağırlık', () => {
    render(<Button title="Kaydet" />);
    expect(buttonStyle().backgroundColor).toBe(theme.colors.primary[600]);
    expect(StyleSheet.flatten(screen.getByText('Kaydet').props.style).fontWeight).toBe('500');
  });

  it('web varyantlarının hepsi çizilir', () => {
    for (const v of ['secondary', 'outline', 'ghost', 'danger', 'success', 'warning', 'link'] as const) {
      const { unmount } = render(<Button variant={v} title={v} />);
      expect(screen.getByText(v)).toBeTruthy();
      unmount();
    }
  });

  it('44pt altındaki görsel ölçüde dokunma alanı hitSlop ile 44e tamamlanır', () => {
    expect(touchSlop(32)).toEqual({ top: 6, bottom: 6 });
    expect(touchSlop(40)).toEqual({ top: 2, bottom: 2 });
    expect(touchSlop(48)).toBeUndefined();
  });

  it('isLoading: kilitli, etiket görünür kalır, basış iletilmez', () => {
    const onPress = jest.fn();
    render(<Button title="Gönder" isLoading onPress={onPress} />);
    expect(screen.getByText('Gönder')).toBeTruthy();
    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
