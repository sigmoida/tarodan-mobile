/**
 * Ortak cam yüzey + cam ikon düğmesi: iOS 26'da GlassView, değilse (iOS < 26 / Android / modül yok)
 * düz fallback. Her iki dalda testID/a11y/dokunma/rozet davranışı aynı kalır.
 */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GlassSurface, TINT_FILL_OPACITY } from '../GlassSurface';
import { GlassIconButton, GLASS_ICON_BUTTON_SIZE } from '../GlassIconButton';
import { theme } from '../../lib/theme';
import { getGlassView } from '../../lib/glass';

jest.mock('../../lib/glass', () => ({ getGlassView: jest.fn(() => null) }));
const getGlassViewMock = getGlassView as jest.Mock;

function Glass(props: any) {
  return <View testID="glass-view" {...props} />;
}
const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, any>;

describe('GlassSurface', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
  });

  it('cam varken GlassView çizer: regular + light, yarıçap size/2, çocuklar içeride', () => {
    getGlassViewMock.mockReturnValue(Glass);
    render(
      <GlassSurface shape="pill" size={64}>
        <Text>içerik</Text>
      </GlassSurface>,
    );
    const glass = screen.getByTestId('glass-view');
    expect(glass.props.glassEffectStyle).toBe('regular');
    expect(glass.props.colorScheme).toBe('light');
    expect(flat(glass)).toMatchObject({ height: 64, borderRadius: 32, overflow: 'hidden' });
    expect(flat(glass).width).toBeUndefined();
    expect(screen.getByText('içerik')).toBeTruthy();
  });

  it('daire: genişlik = yükseklik = size; radius ezilebilir', () => {
    getGlassViewMock.mockReturnValue(Glass);
    render(<GlassSurface size={44} radius={10} />);
    expect(flat(screen.getByTestId('glass-view'))).toMatchObject({ width: 44, height: 44, borderRadius: 10 });
  });

  it('tint: camda tintColor + yarı opak dolgu; fallback düz tint rengi', () => {
    getGlassViewMock.mockReturnValue(Glass);
    const { unmount } = render(<GlassSurface size={64} tint={theme.colors.primary[600]} />);
    expect(screen.getByTestId('glass-view').props.tintColor).toBe(theme.colors.primary[600]);
    const fill = screen.getByTestId('glass-view').children[0] as any;
    expect(flat(fill)).toMatchObject({ backgroundColor: theme.colors.primary[600], opacity: TINT_FILL_OPACITY });
    unmount();
    getGlassViewMock.mockReturnValue(null);
    render(<GlassSurface size={64} tint={theme.colors.primary[600]} testID="s" />);
    expect(screen.queryByTestId('glass-view')).toBeNull();
    expect(flat(screen.getByTestId('s')).backgroundColor).toBe(theme.colors.primary[600]);
  });

  it('iOS fallback: yarı saydam beyaz + ince kenarlık; opaque: opak beyaz + 1px kenarlık', () => {
    getGlassViewMock.mockReturnValue(null);
    Platform.OS = 'ios';
    const { unmount } = render(<GlassSurface size={44} testID="s" />);
    expect(flat(screen.getByTestId('s'))).toMatchObject({
      backgroundColor: theme.colors.overlay.white90,
      borderWidth: StyleSheet.hairlineWidth,
    });
    unmount();
    render(<GlassSurface size={44} opaque testID="s" />);
    expect(flat(screen.getByTestId('s'))).toMatchObject({
      backgroundColor: theme.colors.surface.elevated,
      borderWidth: 1,
    });
  });

  it('Android fallback: beyaz yüzey + elevation, kenarlık yok', () => {
    getGlassViewMock.mockReturnValue(null);
    Platform.OS = 'android';
    render(<GlassSurface size={44} testID="s" />);
    const style = flat(screen.getByTestId('s'));
    expect(style.backgroundColor).toBe(theme.colors.surface.elevated);
    expect(style.elevation).toBeGreaterThan(0);
    expect(style.borderWidth).toBeUndefined();
  });
});

describe.each([
  ['fallback (cam yok)', null],
  ['Liquid Glass', Glass],
])('GlassIconButton — %s', (_n, glass) => {
  beforeEach(() => getGlassViewMock.mockReturnValue(glass));

  it('testID + etiket + onPress; devre dışıyken basılamaz', () => {
    const onPress = jest.fn();
    const { rerender } = render(
      <GlassIconButton testID="btn" icon="shopping-cart" accessibilityLabel="Sepet" onPress={onPress} />,
    );
    expect(screen.getByLabelText('Sepet')).toBeTruthy();
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
    rerender(<GlassIconButton testID="btn" icon="shopping-cart" accessibilityLabel="Sepet" onPress={onPress} disabled />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('btn').props.accessibilityState).toEqual({ disabled: true });
  });

  it('rozet count > 0 iken çizilir, 0 iken çizilmez; dokunma kutusu 44pt', () => {
    const { rerender } = render(
      <GlassIconButton testID="btn" icon="shopping-cart" accessibilityLabel="Sepet" onPress={jest.fn()} count={4} />,
    );
    expect(screen.getByText('4')).toBeTruthy();
    expect(flat(screen.getByTestId('btn'))).toMatchObject({ width: 44, height: GLASS_ICON_BUTTON_SIZE });
    rerender(<GlassIconButton testID="btn" icon="shopping-cart" accessibilityLabel="Sepet" onPress={jest.fn()} count={0} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('cam dalı yalnız cam varken GlassView çizer', () => {
    render(<GlassIconButton icon="share" accessibilityLabel="Paylaş" onPress={jest.fn()} />);
    expect(!!screen.queryByTestId('glass-view')).toBe(glass !== null);
  });
});

describe('GlassIconButton — basma geri bildirimi', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('camda: isInteractive açık, pointerEvents none YOK; devre dışıyken interaktif kapalı', () => {
    getGlassViewMock.mockReturnValue(Glass);
    const { rerender } = render(<GlassIconButton icon="share" accessibilityLabel="Paylaş" onPress={jest.fn()} />);
    const glassView = () => screen.getByTestId('glass-view');
    expect(glassView().props.isInteractive).toBe(true);
    expect(glassView().props.pointerEvents).toBeUndefined();
    rerender(<GlassIconButton icon="share" accessibilityLabel="Paylaş" onPress={jest.fn()} disabled />);
    expect(glassView().props.isInteractive).toBe(false);
  });
});
