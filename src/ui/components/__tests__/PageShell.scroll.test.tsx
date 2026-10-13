/**
 * PageShell — yüzen bar altında kaydırma: scroll modunun otomatik bağlanması, üst dolgu (çift boşluk
 * yok), kenar efekti (bağlı = animasyonlu gradyan, bağlı değil = sabit şerit).
 */
import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { PageShell, RawText, ScreenHeader, theme, usePageScrollValue } from '@/ui';

let mockTop = 0;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: mockTop, right: 0, bottom: 0, left: 0 }),
}));

const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);
const BAR = (top: number) => top + theme.headerHeight;

beforeEach(() => {
  mockTop = 47;
});

describe('PageShell scroll modu — otomatik bağlama', () => {
  it('kendi ScrollView’ı: onScroll bağlı, iOS contentInset = inset + headerHeight, başlangıç ofseti -inset', () => {
    render(
      <PageShell title="Ayarlar">
        <RawText>içerik</RawText>
      </PageShell>,
    );
    const sv = screen.UNSAFE_getByType(ScrollView);
    expect(sv.props.onScroll).toBeDefined();
    expect(sv.props.scrollEventThrottle).toBe(16);
    expect(sv.props.contentInset).toEqual({ top: BAR(47) });
    expect(sv.props.contentOffset).toEqual({ x: 0, y: -BAR(47) });
  });

  it('gövde tepeden başlar (bar üstünde yüzer, çift boşluk yok); kenar efekti animasyonlu gradyan (zemin rengi yok)', () => {
    render(
      <PageShell testID="ps" title="Ayarlar">
        <RawText>içerik</RawText>
      </PageShell>,
    );
    expect(flat('screen-header').position).toBe('absolute');
    expect(flat('screen-header-edge').backgroundColor).toBeUndefined();
    const sv = screen.UNSAFE_getByType(ScrollView);
    // Üst dolgu iOS’ta contentInset’tir; içerik stiline ek paddingTop EKLENMEZ.
    const content = StyleSheet.flatten(sv.props.contentContainerStyle);
    expect(content.padding).toBe(theme.spacing[4]);
    expect(content.paddingTop).toBeUndefined();
  });

  it('Android: üst boşluk içerik paddingTop’una eklenir (inset yok), yenileme göstergesi bar altında', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    render(
      <PageShell title="Ayarlar" onRefresh={jest.fn()}>
        <RawText>içerik</RawText>
      </PageShell>,
    );
    const sv = screen.UNSAFE_getByType(ScrollView);
    expect(sv.props.contentInset).toBeUndefined();
    expect(StyleSheet.flatten(sv.props.contentContainerStyle).paddingTop).toBe(theme.spacing[4] + BAR(47));
    jest.restoreAllMocks();
  });

  it('loading / error / empty: gövde bar kadar aşağıdan başlar ve kenar şeridi sabit', () => {
    render(
      <PageShell title="X" loading>
        <RawText>içerik</RawText>
      </PageShell>,
    );
    expect(screen.queryByText('içerik')).toBeNull();
    expect(flat('screen-header-edge').backgroundColor).toBe(theme.colors.overlay.white95);
    const skeleton = screen.getByTestId('page-shell-skeleton', { includeHiddenElements: true });
    let node = skeleton.parent;
    while (node && StyleSheet.flatten(node.props.style)?.paddingTop !== BAR(47)) node = node.parent;
    expect(node).toBeTruthy();
  });

  it('header={false}: bar da şerit de yok, gövde dolgusuz', () => {
    render(
      <PageShell header={false} mode="static" padding={false}>
        <RawText>tam ekran</RawText>
      </PageShell>,
    );
    expect(screen.queryByTestId('screen-header')).toBeNull();
    expect(screen.queryByTestId('screen-header-edge')).toBeNull();
  });

  it('özel header akışta çizilir (floating={false}) ve gövde ek dolgu almaz', () => {
    render(
      <PageShell header={<ScreenHeader floating={false} title="Sohbet" testID="custom-bar" />} mode="static">
        <RawText>içerik</RawText>
      </PageShell>,
    );
    expect(flat('custom-bar').position).toBeUndefined();
    expect(screen.queryByTestId('custom-bar-edge')).toBeNull();
  });
});

describe('PageShell list/static — ekranın kendi listesi', () => {
  it('bağlanmamış: gövde bar altında başlar, şerit sabit hafif beyaz (hiçbir ekran okunamaz kalmaz)', () => {
    render(
      <PageShell title="Favoriler" mode="list">
        <View testID="list-body" />
      </PageShell>,
    );
    let node = screen.getByTestId('list-body').parent;
    while (node && StyleSheet.flatten(node.props.style)?.paddingTop !== BAR(47)) node = node.parent;
    expect(node).toBeTruthy();
    expect(flat('screen-header-edge').backgroundColor).toBe(theme.colors.overlay.white95);
  });

  it('`scroll` (usePageScrollValue) verilince gövde tepeden başlar ve şerit kaydırmaya bağlanır', () => {
    function Screen() {
      const page = usePageScrollValue();
      return (
        <PageShell title="Favoriler" mode="list" scroll={page}>
          <View testID="list-body" />
        </PageShell>
      );
    }
    render(<Screen />);
    let node = screen.getByTestId('list-body').parent;
    let padded = false;
    while (node) {
      if (StyleSheet.flatten(node.props.style)?.paddingTop === BAR(47)) padded = true;
      node = node.parent;
    }
    expect(padded).toBe(false);
    expect(flat('screen-header-edge').backgroundColor).toBeUndefined();
  });

  it('`scroll` verilse bile loading iskeleti bar altından başlar (liste henüz yok)', () => {
    function Screen() {
      const page = usePageScrollValue();
      return (
        <PageShell title="Favoriler" mode="list" scroll={page} loading>
          <View />
        </PageShell>
      );
    }
    render(<Screen />);
    expect(flat('screen-header-edge').backgroundColor).toBe(theme.colors.overlay.white95);
  });
});
