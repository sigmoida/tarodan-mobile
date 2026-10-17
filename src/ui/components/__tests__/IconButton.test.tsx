import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { IconButton, iconButtonBoxSize, theme } from '@/ui';

const boxStyle = () => {
  const style = screen.getByRole('button').props.style;
  return StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style);
};

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

  it('dokunma alanı en az 44pt', () => {
    render(<IconButton icon="close" size="xs" accessibilityLabel="Kapat" />);
    expect(screen.getByRole('button').props.hitSlop).toBe(10);
  });
});
