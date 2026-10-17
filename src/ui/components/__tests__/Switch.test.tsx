/**
 * Switch: dokunma ≥44pt'lik dış Pressable'da (Fabric'te UISwitch hitSlop'u yok sayar); iç RN Switch
 * dokunmaya ve erişilebilirliğe kapalı. iOS `sm` (varsayılan) ölçülen yerel genişliği 44pt'ye
 * ölçekler (iOS < 26 ≈ 51, iOS 26 ≈ 64). `md` yerel boy; Android ölçeklenmez.
 */
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { theme } from '../../lib/theme';
import { Switch } from '../Switch';

// İç anahtar erişilebilirlikten gizli → varsayılan sorgular onu görmez.
const native = () => screen.getByTestId('sw-native', { includeHiddenElements: true });
const nativeStyle = () => StyleSheet.flatten(native().props.style);

describe('Switch', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('dış kutu ≥44pt, rol switch + checked durumu; iç anahtar dokunmaya/erişilebilirliğe kapalı', () => {
    render(<Switch testID="sw" value accessibilityLabel="Bildirim" onValueChange={jest.fn()} />);
    const hit = screen.getByTestId('sw');
    expect(StyleSheet.flatten(hit.props.style)).toMatchObject({
      minWidth: theme.minTouchTarget,
      minHeight: theme.minTouchTarget,
    });
    expect(hit.props.accessibilityRole).toBe('switch');
    expect(hit.props.accessibilityState).toMatchObject({ checked: true, disabled: false });
    expect(screen.getByRole('switch', { name: 'Bildirim' })).toBeTruthy();
    const inner = native().parent!;
    let wrapper: ReturnType<typeof native> | null = inner;
    while (wrapper && wrapper.props.pointerEvents !== 'none') wrapper = wrapper.parent;
    expect(wrapper!.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(wrapper!.props.accessibilityElementsHidden).toBe(true);
  });

  it('dış kutuya basınca değeri tersine çevirir; devre dışıyken çağırmaz', () => {
    const onChange = jest.fn();
    const { rerender } = render(<Switch testID="sw" value={false} onValueChange={onChange} />);
    fireEvent.press(screen.getByTestId('sw'));
    expect(onChange).toHaveBeenCalledWith(true);
    onChange.mockClear();
    rerender(<Switch testID="sw" value onValueChange={onChange} />);
    fireEvent.press(screen.getByTestId('sw'));
    expect(onChange).toHaveBeenCalledWith(false);
    onChange.mockClear();
    rerender(<Switch testID="sw" value onValueChange={onChange} disabled />);
    fireEvent.press(screen.getByTestId('sw'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('iOS sm: ölçülen yerel genişliği 44pt\'ye ölçekler (iOS 26 ≈ 64×28 dahil)', () => {
    Platform.OS = 'ios';
    render(<Switch testID="sw" value={false} onValueChange={jest.fn()} />);
    for (const [w, h] of [
      [51, 31],
      [64, 28],
    ] as const) {
      act(() => native().props.onLayout({ nativeEvent: { layout: { width: w, height: h } } }));
      const s = nativeStyle();
      const scale = (s.transform as { scale: number }[])[0]!.scale;
      expect(w * scale).toBeCloseTo(44);
      expect(s.marginHorizontal).toBeCloseTo(-(w - 44) / 2);
      expect(s.marginVertical).toBeCloseTo(-(h * (1 - scale)) / 2);
    }
  });

  it('md: yerel boy, ölçek yok', () => {
    Platform.OS = 'ios';
    render(<Switch testID="sw" size="md" value={false} onValueChange={jest.fn()} />);
    expect(nativeStyle()?.transform).toBeUndefined();
  });

  it('Android: ölçeklenmez', () => {
    Platform.OS = 'android';
    render(<Switch testID="sw" value={false} onValueChange={jest.fn()} />);
    expect(nativeStyle()?.transform).toBeUndefined();
  });
});
