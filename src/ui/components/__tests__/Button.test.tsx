import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, theme } from '@/ui';
import { pressableStyle } from '@/test-utils';
import { touchSlop } from '../Button';

const buttonStyle = (pressed = false) => pressableStyle(screen.getByRole('button'), pressed);

// `jest.replaceProperty(Platform, 'OS', ...)` in a test is undone after it.
afterEach(() => jest.restoreAllMocks());

describe('Button (web @tarodan/ui ölçüleri)', () => {
  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 48],
    ['xl', 56],
  ] as const)('%s asgari yüksekliği %i (büyük yazı ölçeğinde kırpılmadan büyür)', (size, height) => {
    render(<Button size={size} title="Kaydet" />);
    // Sabit `height` yerine `minHeight`: normal ölçekte düğme tam bu boyda, büyük ölçekte büyür.
    expect(buttonStyle().minHeight).toBe(height);
    expect(buttonStyle().height).toBeUndefined();
    expect(buttonStyle().borderRadius).toBe(theme.radius.lg);
  });

  // Etiket boyu ölçekten: sm web gibi 14, md/lg/xl telefonda bir basamak büyük (gövde/Input ile uyumlu).
  it.each([
    ['sm', 'sm', 14],
    ['md', 'base', 16],
    ['lg', 'lg', 17],
    ['xl', 'xl', 20],
  ] as const)('%s etiketi fontSize.%s (%i) ve tek satır', (size, token, pt) => {
    render(<Button size={size} title="Kaydet" />);
    const label = screen.getByText('Kaydet');
    expect(StyleSheet.flatten(label.props.style).fontSize).toBe(theme.typography.fontSize[token]);
    expect(theme.typography.fontSize[token]).toBe(pt);
    expect(label.props.numberOfLines).toBe(1);
  });

  it('primary = primary-600, etiket 500 ağırlık', () => {
    render(<Button title="Kaydet" />);
    expect(buttonStyle().backgroundColor).toBe(theme.colors.primary[600]);
    expect(StyleSheet.flatten(screen.getByText('Kaydet').props.style).fontWeight).toBe('500');
  });

  it('web varyantlarının hepsi çizilir', () => {
    for (const v of ['secondary', 'outline', 'outlinePrimary', 'ghost', 'danger', 'success', 'warning', 'link'] as const) {
      const { unmount } = render(<Button variant={v} title={v} />);
      expect(screen.getByText(v)).toBeTruthy();
      unmount();
    }
  });

  it('outlinePrimary (web outline-primary): transparent, primary-600 border, primary-700 label', () => {
    render(<Button variant="outlinePrimary" title="Sepete Ekle" icon="shopping-cart" />);
    expect(buttonStyle()).toMatchObject({
      backgroundColor: 'transparent',
      borderColor: theme.colors.primary[600],
      borderWidth: 1,
      opacity: 1,
    });
    // 700, not 600: the AA contrast choice web made (600 on white is 3.56:1).
    expect(StyleSheet.flatten(screen.getByText('Sepete Ekle').props.style).color).toBe(theme.colors.primary[700]);
    expect(screen.getByTestId('icon-shopping-cart').props.stroke).toBe(theme.colors.primary[700]);
  });

  it('outlinePrimary press: web active:bg-primary-100 on iOS, the ripple alone on Android', () => {
    render(<Button variant="outlinePrimary" title="Sepete Ekle" />);
    expect(buttonStyle(true).backgroundColor).toBe(theme.colors.primary[100]);
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(buttonStyle(true).backgroundColor).toBe('transparent');
  });

  it('outlinePrimary dims like the other variants when disabled', () => {
    render(<Button variant="outlinePrimary" title="Sepete Ekle" disabled />);
    expect(buttonStyle().opacity).toBe(0.5);
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
