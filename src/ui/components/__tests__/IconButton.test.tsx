import React from 'react';
import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { IconButton, iconButtonBoxSize, theme } from '@/ui';
import { pressableStyle } from '@/test-utils';

const boxStyle = (pressed = false) => pressableStyle(screen.getByRole('button'), pressed);

// `jest.replaceProperty(Platform, 'OS', ...)` in a test is undone after it.
afterEach(() => jest.restoreAllMocks());

describe('IconButton (web @tarodan/ui)', () => {
  it('web boyutları xs/sm/md/lg = 24/32/40/48', () => {
    expect(['xs', 'sm', 'md', 'lg'].map((s) => iconButtonBoxSize(s as 'xs'))).toEqual([24, 32, 40, 48]);
  });

  it('varsayılan ghost: zeminsiz, muted ikon, rounded-lg', () => {
    render(<IconButton icon="x-mark" accessibilityLabel="Kapat" />);
    expect(boxStyle()).toMatchObject({ backgroundColor: 'transparent', borderRadius: theme.radius.lg });
    expect(screen.getByTestId('icon-x-mark').props.stroke).toBe(theme.colors.text.muted);
  });

  it('eski takma adlar çalışır (solid → primary)', () => {
    render(<IconButton icon="plus" variant="solid" accessibilityLabel="Ekle" />);
    expect(boxStyle().backgroundColor).toBe(theme.colors.primary[600]);
  });

  it('outline-primary: transparent, primary-600 border, primary-700 icon', () => {
    render(<IconButton icon="shopping-cart" variant="outline-primary" accessibilityLabel="Sepete ekle" />);
    expect(boxStyle()).toMatchObject({
      backgroundColor: 'transparent',
      borderColor: theme.colors.primary[600],
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      opacity: 1,
    });
    // 700, not 600: the AA contrast choice web made (600 on white is 3.56:1).
    expect(screen.getByTestId('icon-shopping-cart').props.stroke).toBe(theme.colors.primary[700]);
  });

  it('a variant without a pressed fill still fades on the iOS press', () => {
    render(<IconButton icon="plus" variant="primary" accessibilityLabel="Ekle" />);
    expect(boxStyle(true).opacity).toBe(0.7);
  });

  it('outline-primary press: web active:bg-primary-100 on iOS, the ripple alone on Android', () => {
    render(<IconButton icon="shopping-cart" variant="outline-primary" accessibilityLabel="Sepete ekle" />);
    expect(boxStyle(true).backgroundColor).toBe(theme.colors.primary[100]);
    // The tint is the feedback: border and foreground keep full opacity (their AA contrast).
    expect(boxStyle(true).opacity).toBe(1);
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(boxStyle(true).backgroundColor).toBe('transparent');
  });

  it('outline-primary dims like the other variants when disabled or loading', () => {
    const { rerender } = render(
      <IconButton icon="shopping-cart" variant="outline-primary" disabled accessibilityLabel="Sepete ekle" />,
    );
    expect(boxStyle().opacity).toBe(0.5);
    rerender(<IconButton icon="shopping-cart" variant="outline-primary" isLoading accessibilityLabel="Sepete ekle" />);
    expect(boxStyle().opacity).toBe(0.5);
    expect(screen.getByRole('button').props.accessibilityState).toEqual({ disabled: true, busy: true });
  });

  it('dokunma alanı en az 44pt', () => {
    render(<IconButton icon="close" size="xs" accessibilityLabel="Kapat" />);
    expect(screen.getByRole('button').props.hitSlop).toBe(10);
  });
});
