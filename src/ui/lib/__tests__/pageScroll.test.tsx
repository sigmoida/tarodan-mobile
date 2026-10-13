import React from 'react';
import { StyleSheet } from 'react-native';
import { render, renderHook, screen } from '@testing-library/react-native';
import {
  SCROLL_EDGE_FULL_AT,
  ShellScrollProvider,
  pageScrollOffset,
  pageScrollProps,
  scrollEdgeOpacity,
  usePageScrollHandler,
  usePageScrollValue,
  useResetScrollOnBind,
  useShellPageScroll,
  useShellScrollState,
  withTopInset,
} from '../pageScroll';

describe('scrollEdgeOpacity — kaydırma ofsetinden kenar efekti opaklığı (saf)', () => {
  it('0 ve altında yok (üst bounce dahil), 24pt ve üstünde tam, arası doğrusal', () => {
    expect(SCROLL_EDGE_FULL_AT).toBe(24);
    expect(scrollEdgeOpacity(0)).toBe(0);
    expect(scrollEdgeOpacity(-40)).toBe(0);
    expect(scrollEdgeOpacity(12)).toBeCloseTo(0.5);
    expect(scrollEdgeOpacity(24)).toBe(1);
    expect(scrollEdgeOpacity(500)).toBe(1);
  });
});

describe('pageScrollOffset — iOS contentInset normalizasyonu (saf)', () => {
  it('dinlenme ofseti -inset iken 0; inset yoksa ham ofset', () => {
    expect(pageScrollOffset(-99, 99)).toBe(0);
    expect(pageScrollOffset(31, 99)).toBe(130);
    expect(pageScrollOffset(40)).toBe(40);
  });
});

describe('withTopInset / pageScrollProps (saf)', () => {
  it('iOS: stil aynen döner, üst boşluk contentInset ile verilir (yenileme göstergesi barın altında)', () => {
    const base = { padding: 16 };
    expect(withTopInset(base, 99, 'ios')).toBe(base);
    expect(pageScrollProps(99, 'ios')).toMatchObject({
      contentInset: { top: 99 },
      contentOffset: { x: 0, y: -99 },
      scrollIndicatorInsets: { top: 99 },
    });
  });

  it('Android: içerik paddingTop’una eklenir (paddingTop > paddingVertical > padding); props boş', () => {
    expect(StyleSheet.flatten(withTopInset({ padding: 16 }, 99, 'android'))).toMatchObject({ padding: 16, paddingTop: 115 });
    expect(StyleSheet.flatten(withTopInset([{ padding: 16 }, { paddingTop: 4 }], 99, 'android'))).toMatchObject({
      paddingTop: 103,
    });
    expect(StyleSheet.flatten(withTopInset(undefined, 99, 'android'))).toMatchObject({ paddingTop: 99 });
    expect(pageScrollProps(99, 'android')).toEqual({});
  });
});

describe('hook’lar', () => {
  it('usePageScrollValue: scrollY 0, topInset = inset + headerHeight (jest inset 0 -> 52)', () => {
    const { result } = renderHook(() => usePageScrollValue());
    expect(result.current.scrollY.value).toBe(0);
    expect(result.current.topInset).toBe(52);
  });

  it('usePageScrollHandler: onScroll + scrollEventThrottle 16', () => {
    const { result } = renderHook(() => usePageScrollHandler());
    expect(result.current.onScroll).toBeDefined();
    expect(result.current.scrollEventThrottle).toBe(16);
  });

  it('kabuk bağlamı: çocuk useShellPageScroll ile bağlanınca kabuk bound olur, ayrılınca düşer; bağlamsız null', () => {
    const { result: outside } = renderHook(() => useShellPageScroll());
    expect(outside.current).toBeNull();

    let bound = false;
    function Child({ enabled }: { enabled: boolean }) {
      useShellPageScroll(enabled);
      return null;
    }
    function Shell({ enabled }: { enabled: boolean }) {
      const s = useShellScrollState(undefined, false);
      bound = s.bound;
      return (
        <ShellScrollProvider value={s.ctx}>
          <Child enabled={enabled} />
        </ShellScrollProvider>
      );
    }
    const { rerender } = render(<Shell enabled />);
    expect(bound).toBe(true);
    rerender(<Shell enabled={false} />);
    expect(bound).toBe(false);
    expect(screen).toBeTruthy();
  });

  it('useResetScrollOnBind: bağlanma durumu değişince bayat ofset 0’a çekilir', () => {
    const { result, rerender } = renderHook(
      ({ bound }: { bound: boolean }) => {
        const v = usePageScrollValue();
        useResetScrollOnBind(v.scrollY, bound);
        return v;
      },
      { initialProps: { bound: false } },
    );
    result.current.scrollY.value = 80;
    rerender({ bound: true });
    expect(result.current.scrollY.value).toBe(0);
  });

  it('useShellScrollState: ekranın verdiği sinyal ya da kabuğun kendi scroll’u bağlıdır', () => {
    const { result } = renderHook(() => {
      const value = usePageScrollValue();
      return { value, none: useShellScrollState(undefined, false), provided: useShellScrollState(value, false), own: useShellScrollState(undefined, true) };
    });
    expect(result.current.none.bound).toBe(false);
    expect(result.current.provided.bound).toBe(true);
    expect(result.current.provided.page).toBe(result.current.value);
    expect(result.current.own.bound).toBe(true);
  });
});
