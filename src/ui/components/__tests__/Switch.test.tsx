/**
 * Switch boyu: varsayılan `sm` web Switch'ine (≈44×24) yakın — iOS yerel 51×31 anahtar 0.8 ölçekle
 * küçülür, yerleşim kutusu negatif kenar boşluğuyla görsele çekilir, dokunma hedefi hitSlop ile
 * ≥44pt kalır. `md` yerel boy. Android'de ölçek yok (Material anahtar zaten kompakt).
 */
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Switch } from '../Switch';

const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

describe('Switch', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('iOS varsayılan (sm): 0.8 ölçek + negatif kenar boşluğu + 44pt dokunma hedefi', () => {
    Platform.OS = 'ios';
    render(<Switch testID="sw" value={false} onValueChange={jest.fn()} />);
    const style = flat('sw');
    expect(style.transform).toEqual([{ scale: 0.8 }]);
    expect(style.marginHorizontal).toBeCloseTo(-5.1);
    expect(style.marginVertical).toBeCloseTo(-3.1);
    const slop = screen.getByTestId('sw').props.hitSlop;
    // hitSlop yerel koordinatta: (top+bottom)·0.8 + görsel yükseklik (31·0.8) ≥ 44
    expect((slop.top + slop.bottom) * 0.8 + 31 * 0.8).toBeGreaterThanOrEqual(44);
  });

  it('md: yerel boy, ölçek yok', () => {
    Platform.OS = 'ios';
    render(<Switch testID="sw" size="md" value={false} onValueChange={jest.fn()} />);
    expect(flat('sw')?.transform).toBeUndefined();
  });

  it('Android: ölçeklenmez', () => {
    Platform.OS = 'android';
    render(<Switch testID="sw" value={false} onValueChange={jest.fn()} />);
    expect(flat('sw')?.transform).toBeUndefined();
  });

  it('değer değişimini iletir', () => {
    const onChange = jest.fn();
    render(<Switch testID="sw" value={false} onValueChange={onChange} />);
    fireEvent(screen.getByTestId('sw'), 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
