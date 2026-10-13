/**
 * Üst bar standardı: her yığın ekranında bar yüksekliği, başlık konumu ve geri oku AYNI.
 * - Güvenli alan üst boşluğu tek formül (`useHeaderTopInset` = insets.top; 44pt minimum yok).
 * - İçerik yüksekliği tek sabit (`theme.headerHeight`), alt başlık olsa bile.
 * - Başlık ORTALI, tek satır; geri oku cam daire, chevron-left 24 başlık rengi.
 * - SheetHeader aynı yükseklik; Android tam ekran sheet'te üst inset.
 */
import React from 'react';
import { Platform, StyleSheet, Text as RNText } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScreenHeader, SheetHeader, PageShell, theme } from '@/ui';

let mockTop = 0;
jest.mock('react-native-safe-area-context', () => {
  const inset = (top: number) => ({ top, right: 0, bottom: 0, left: 0 });
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => inset(mockTop),
  };
});

const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

afterEach(() => {
  mockTop = 0;
  jest.restoreAllMocks();
});

describe('ScreenHeader — tek standart', () => {
  it.each([0, 20, 47, 59])('üst boşluk = insets.top (%i); 44pt minimum yok', (top) => {
    mockTop = top;
    render(<ScreenHeader title="Ayarlar" />);
    expect(flat('screen-header').paddingTop).toBe(top);
  });

  it('içerik yüksekliği headerHeight; alt başlık barı büyütmez', () => {
    const { rerender } = render(<ScreenHeader title="Ödeme" />);
    expect(flat('screen-header-row').height).toBe(theme.headerHeight);
    rerender(<ScreenHeader title="Ödeme" subtitle="PayTR" />);
    expect(flat('screen-header-row').height).toBe(theme.headerHeight);
  });

  it('başlık ORTALI (tek satır, ellipsis); yan slotlar eşit genişlik', () => {
    render(<ScreenHeader title="Adreslerim" />);
    const title = screen.getByText('Adreslerim');
    expect(StyleSheet.flatten(title.props.style).textAlign).toBe('center');
    expect(title.props.numberOfLines).toBe(1);
    expect(flat('screen-header-left').width).toBe(flat('screen-header-right').width);
  });

  it('geri oku: cam daire, chevron-left, 24, başlık rengi, 44pt dokunma alanı', () => {
    const onBack = jest.fn();
    render(<ScreenHeader title="X" onBack={onBack} />);
    const icon = screen.getByTestId('icon-chevron-left');
    expect(icon.props.width).toBe(theme.iconSize.lg);
    expect(icon.props.stroke).toBe(theme.colors.text.heading);
    const btn = screen.getByLabelText('Geri');
    const box = StyleSheet.flatten(btn.props.style);
    expect(box.width).toBeGreaterThanOrEqual(theme.minTouchTarget);
    expect(box.height).toBeGreaterThanOrEqual(theme.minTouchTarget);
    fireEvent.press(btn);
    expect(onBack).toHaveBeenCalled();
  });

  it('leading geri okunun yerine geçer; titleSlot başlığın yerine geçer', () => {
    render(
      <ScreenHeader
        title="Gizli"
        leading={<RNText>kapat</RNText>}
        titleSlot={<RNText>avatar+ad</RNText>}
      />,
    );
    expect(screen.getByText('kapat')).toBeTruthy();
    expect(screen.getByText('avatar+ad')).toBeTruthy();
    expect(screen.queryByLabelText('Geri')).toBeNull();
    expect(screen.queryByText('Gizli')).toBeNull();
  });

  it('transparent: zemin ve alt çizgi yok, yükseklik aynı', () => {
    render(<ScreenHeader title="Galeri" transparent />);
    expect(flat('screen-header').backgroundColor).toBeUndefined();
    expect(screen.queryByTestId('screen-header-edge')).toBeNull();
    expect(flat('screen-header-row').height).toBe(theme.headerHeight);
  });

  it('PageShell aynı barı çizer (yükseklik + inset)', () => {
    mockTop = 47;
    render(<PageShell title="Sepet" />);
    expect(flat('screen-header').paddingTop).toBe(47);
    expect(flat('screen-header-row').height).toBe(theme.headerHeight);
  });
});

describe('SheetHeader', () => {
  it('başlık sola, kapat sağda, sabit headerHeight; dekoratif ikon yok', () => {
    const onClose = jest.fn();
    render(<SheetHeader title="Filtreler" onClose={onClose} closeLabel="Kapat" testID="sh" />);
    expect(screen.getByText('Filtreler')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('Filtreler').props.style).textAlign).not.toBe('center');
    expect(flat('sh-row').height).toBe(theme.headerHeight);
    expect(screen.getAllByTestId(/^icon-/)).toHaveLength(1);
    fireEvent.press(screen.getByLabelText('Kapat'));
    expect(onClose).toHaveBeenCalled();
  });

  it('onClose yoksa kapat düğmesi çizilmez', () => {
    render(<SheetHeader title="Bilgi" />);
    expect(screen.queryByTestId('sheet-header-close')).toBeNull();
  });

  it('fullScreen: Android’de üst inset eklenir, iOS’ta eklenmez', () => {
    mockTop = 32;
    jest.replaceProperty(Platform, 'OS', 'android');
    const { rerender } = render(<SheetHeader title="Şehir" fullScreen testID="sh" />);
    expect(flat('sh').paddingTop).toBe(32);
    jest.replaceProperty(Platform, 'OS', 'ios');
    rerender(<SheetHeader title="Şehir" fullScreen testID="sh" />);
    expect(flat('sh').paddingTop).toBe(0);
    rerender(<SheetHeader title="Şehir" testID="sh" />);
    expect(flat('sh').paddingTop).toBe(0);
  });
});
