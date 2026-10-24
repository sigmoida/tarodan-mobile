/**
 * D-4.3/4.4: ana sayfa hero'su API'den gelir. Görünür slayt yokken hiçbir
 * şey çizilmez (yükleniyor/yer tutma kararı ekranda); CTA'lar paylaşılan openAdLink ile açılır, tıklama
 * `?cta=` ile TEK istek olarak sayılır, gösterim görünürlükte (mount'ta değil).
 */
import React from 'react';
import { AppState, Dimensions, ScrollView, StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockRecordClick = jest.fn((..._a: unknown[]) => Promise.resolve());
const mockRecordImpression = jest.fn((..._a: unknown[]) => Promise.resolve());
jest.mock('@/lib/api', () => ({
  adsApi: { recordImpression: jest.fn(), recordClick: jest.fn() },
  heroApi: {
    recordClick: (...a: unknown[]) => mockRecordClick(...a),
    recordImpression: (...a: unknown[]) => mockRecordImpression(...a),
  },
}));

const mockPush = jest.fn();
// Odak kaybını (sekme değişimi) taklit etmek için useFocusEffect temizleyicileri tutulur.
const mockBlur: Array<() => void> = [];
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: (...a: unknown[]) => mockPush(...a) },
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb() as () => void;
        mockBlur.push(cleanup);
        return cleanup;
      }, [cb]);
    },
  };
});

import { HeroSection } from '../HeroSlider';
import { HeroReserved } from '../HeroReserved';
import { heroReservedHeight } from '../../_lib/heroLayout';
import * as heroView from '@/lib/hero/heroView';
import { IMPRESSION_DWELL_MS } from '@/lib/ads/useAdImpression';
import type { HeroSlide } from '@/lib/api/hero';

const slide = (over: Partial<HeroSlide> = {}): HeroSlide => ({
  id: 's1',
  placement: 'home',
  imageUrl: 'https://cdn.example/a.jpg',
  mobileImageUrl: null,
  imageSide: 'left',
  title: { tr: 'Başlık', en: 'Title' },
  subtitle: { tr: 'Alt başlık', en: 'Subtitle' },
  imageAlt: null,
  cta1: { label: { tr: 'Gez', en: 'Browse' }, href: '/listings?manufacturer=Hot+Wheels' },
  cta2: null,
  hideOnIos: false,
  ...over,
});

const loadImage = (api: ReturnType<typeof render>, id: string) =>
  act(() => {
    api.getByTestId(`hero-image-${id}`).props.onLoad({ nativeEvent: { source: { width: 800, height: 500 } } });
  });

const layout = (api: ReturnType<typeof render>, width = 320) =>
  fireEvent(api.getByTestId('hero-scroller'), 'layout', { nativeEvent: { layout: { width, height: 400 } } });

describe('HeroSection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRecordClick.mockClear();
    mockRecordImpression.mockClear();
    mockPush.mockClear();
    mockBlur.length = 0;
  });
  afterEach(() => jest.useRealTimers());

  it('HeroReserved: ekran genişliğinden hesaplanan yükseklikte boş yer tutar', () => {
    const api = render(<HeroReserved />);
    const style = StyleSheet.flatten(api.getByTestId('hero-reserved').props.style);
    expect(style.height).toBeCloseTo(heroReservedHeight(Dimensions.get('window').width), 5);
  });

  it('görünür slayt yoksa hiçbir şey çizilmez (statik yedek hero yok)', () => {
    const api = render(<HeroSection slides={[]} locale="tr" />);
    expect(api.toJSON()).toBeNull();
    expect(api.queryByTestId('hero-slider')).toBeNull();
    expect(api.queryByTestId('hero-banner')).toBeNull();
  });

  it('slayt başlığı/alt başlığı/CTA etiketi dile göre', () => {
    const api = render(<HeroSection slides={[slide()]} locale="en" />);
    layout(api);
    expect(api.getByText('Title')).toBeTruthy();
    expect(api.getByText('Subtitle')).toBeTruthy();
    expect(api.getByText('Browse')).toBeTruthy();
  });

  it('CTA: tek tık isteği (?cta=1) + openAdLink ile rota', () => {
    const api = render(<HeroSection slides={[slide()]} locale="tr" />);
    layout(api);
    fireEvent.press(api.getByTestId('hero-cta-s1-1'));
    expect(mockRecordClick).toHaveBeenCalledTimes(1);
    expect(mockRecordClick).toHaveBeenCalledWith('s1', 1);
    expect(mockPush).toHaveBeenCalledWith('/search?manufacturer=Hot+Wheels');
  });

  it('satın alma hedefli CTA çizilmez ve hiçbir şey açmaz', () => {
    const api = render(
      <HeroSection
        slides={[slide({ cta1: null, cta2: { label: { tr: 'Üye ol' }, href: '/membership' } })]}
        locale="tr"
      />,
    );
    layout(api);
    expect(api.queryByTestId('hero-cta-s1-2')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('gösterim: mount anında değil, ~1 sn sonra, slayt başına bir kez', () => {
    const api = render(<HeroSection slides={[slide(), slide({ id: 's2' })]} locale="tr" />);
    layout(api);
    expect(mockRecordImpression).not.toHaveBeenCalled();
    loadImage(api, 's1');
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
    });
    // Yalnız geçerli (ilk) slayt görünür → yalnız o sayılır.
    expect(mockRecordImpression).toHaveBeenCalledTimes(1);
    expect(mockRecordImpression).toHaveBeenCalledWith('s1');
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
    });
    expect(mockRecordImpression).toHaveBeenCalledTimes(1);
  });

  it('görsel yüklenmeden gösterim sayılmaz; yüklenince ~1 sn sonra sayılır', () => {
    const api = render(<HeroSection slides={[slide()]} locale="tr" />);
    layout(api);
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS * 3);
    });
    expect(mockRecordImpression).not.toHaveBeenCalled();
    loadImage(api, 's1');
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
    });
    expect(mockRecordImpression).toHaveBeenCalledWith('s1');
  });

  it('liste kısalınca current sınırlanır, geçerli slayt görünür sayılır ve ofset yeniden oturur', () => {
    const scrollTo = jest.spyOn(ScrollView.prototype as any, 'scrollTo').mockImplementation(() => {});
    const three = [slide({ id: 'a' }), slide({ id: 'b' }), slide({ id: 'c' })];
    const api = render(<HeroSection slides={three} locale="tr" />);
    layout(api);
    // Kullanıcı 3. sayfaya (320 genişlikte x=640) kaydırdı.
    fireEvent(api.getByTestId('hero-scroller'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 640 } },
    });
    scrollTo.mockClear();
    api.rerender(<HeroSection slides={[three[0]!]} locale="tr" />);
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
    // Kalan tek slayt "geçerli": görsel yüklenince gösterim sayılır.
    loadImage(api, 'a');
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
    });
    expect(mockRecordImpression).toHaveBeenCalledWith('a');
    scrollTo.mockRestore();
  });

  describe('otomatik ilerleme', () => {
    const AUTOPLAY = 10_000;
    let scrollTo: jest.SpyInstance;
    beforeEach(() => {
      scrollTo = jest.spyOn(ScrollView.prototype as any, 'scrollTo').mockImplementation(() => {});
    });
    afterEach(() => scrollTo.mockRestore());

    const mount = () => {
      const api = render(<HeroSection slides={[slide({ id: 'a' }), slide({ id: 'b' })]} locale="tr" />);
      layout(api);
      scrollTo.mockClear();
      return api;
    };
    const scroller = (api: ReturnType<typeof render>) => api.getByTestId('hero-scroller');
    const advanced = () => scrollTo.mock.calls.filter(([a]) => a.animated === true).length;

    it('10 sn sonra sonraki slayta geçer', () => {
      mount();
      act(() => {
        jest.advanceTimersByTime(AUTOPLAY);
      });
      expect(advanced()).toBe(1);
      expect(scrollTo).toHaveBeenLastCalledWith({ x: 320, animated: true });
    });

    it('sürükleme sırasında durur; bırakılınca yeniden sayar', () => {
      const api = mount();
      fireEvent(scroller(api), 'scrollBeginDrag');
      act(() => {
        jest.advanceTimersByTime(AUTOPLAY * 3);
      });
      expect(advanced()).toBe(0);
      fireEvent(scroller(api), 'scrollEndDrag');
      act(() => {
        jest.advanceTimersByTime(AUTOPLAY - 1);
      });
      expect(advanced()).toBe(0);
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(advanced()).toBe(1);
    });

    it('momentum bitişi de sürüklemeyi bitirir', () => {
      const api = mount();
      fireEvent(scroller(api), 'scrollBeginDrag');
      fireEvent(scroller(api), 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 320 } } });
      act(() => {
        jest.advanceTimersByTime(AUTOPLAY);
      });
      expect(advanced()).toBe(1);
    });
  });

  describe('genişlik', () => {
    let scrollTo: jest.SpyInstance;
    beforeEach(() => {
      scrollTo = jest.spyOn(ScrollView.prototype as any, 'scrollTo').mockImplementation(() => {});
    });
    afterEach(() => scrollTo.mockRestore());

    it('slayt genişliği yuvarlanmaz: gerçek layout.width kullanılır', () => {
      const api = render(<HeroSection slides={[slide()]} locale="tr" />);
      layout(api, 320.4);
      expect(StyleSheet.flatten(api.getByTestId('hero-slide-s1').props.style).width).toBe(320.4);
    });

    it('genişlik değişince (döndürme/bölünmüş ekran) ofset current*width ile yeniden oturur', () => {
      const api = render(<HeroSection slides={[slide({ id: 'a' }), slide({ id: 'b' })]} locale="tr" />);
      layout(api, 320);
      fireEvent(api.getByTestId('hero-scroller'), 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 320 } },
      });
      scrollTo.mockClear();
      layout(api, 480.5);
      expect(scrollTo).toHaveBeenLastCalledWith({ x: 480.5, animated: false });
    });
  });

  describe('ekran dışındayken', () => {
    const AUTOPLAY = 10_000;
    let scrollTo: jest.SpyInstance;
    // Slider ve her slayt kendi AppState dinleyicisini kaydeder; hepsine haber verilir.
    const appListeners: Array<(s: string) => void> = [];
    const setAppState = (st: string) => act(() => appListeners.forEach((l) => l(st)));
    beforeEach(() => {
      appListeners.length = 0;
      scrollTo = jest.spyOn(ScrollView.prototype as any, 'scrollTo').mockImplementation(() => {});
      jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
        appListeners.push(cb);
        return { remove: jest.fn() };
      }) as any);
    });
    afterEach(() => jest.restoreAllMocks());

    const mount = (visible = true) => {
      const slides = [slide({ id: 'a' }), slide({ id: 'b' })];
      const api = render(<HeroSection slides={slides} locale="tr" visible={visible} />);
      layout(api);
      scrollTo.mockClear();
      return { api, slides };
    };
    const advanced = () => scrollTo.mock.calls.filter(([a]) => a.animated === true).length;

    it('hero görünür alanda değilken otomatik ilerleme durur; geri gelince sürer', () => {
      const { api, slides } = mount(false);
      act(() => {
        jest.advanceTimersByTime(AUTOPLAY * 3);
      });
      expect(advanced()).toBe(0);
      api.rerender(<HeroSection slides={slides} locale="tr" visible />);
      act(() => {
        jest.advanceTimersByTime(AUTOPLAY);
      });
      expect(advanced()).toBe(1);
    });

    it('hero görünür değilken gösterim sayılmaz', () => {
      const { api, slides } = mount(false);
      loadImage(api, 'a');
      act(() => {
        jest.advanceTimersByTime(IMPRESSION_DWELL_MS * 3);
      });
      expect(mockRecordImpression).not.toHaveBeenCalled();
      api.rerender(<HeroSection slides={slides} locale="tr" visible />);
      act(() => {
        jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
      });
      expect(mockRecordImpression).toHaveBeenCalledWith('a');
    });

    it('sekme odakta değilken otomatik ilerleme durur', () => {
      mount();
      act(() => mockBlur.forEach((f) => f()));
      act(() => {
        jest.advanceTimersByTime(AUTOPLAY * 3);
      });
      expect(advanced()).toBe(0);
    });

    it('uygulama arka plandayken otomatik ilerleme durur; öne gelince sürer', () => {
      mount();
      setAppState('background');
      act(() => {
        jest.advanceTimersByTime(AUTOPLAY * 3);
      });
      expect(advanced()).toBe(0);
      setAppState('active');
      act(() => {
        jest.advanceTimersByTime(AUTOPLAY);
      });
      expect(advanced()).toBe(1);
    });
  });

  it('slayt öğesi memoize: üst durum değişince (sürükleme) değişmeyen slayt yeniden çizilmez', () => {
    const slides = [slide({ id: 'a' }), slide({ id: 'b' })];
    const api = render(<HeroSection slides={slides} locale="tr" />);
    layout(api);
    const spy = jest.spyOn(heroView, 'pickLocalized');
    spy.mockClear();
    // Slider state'i değişir (dragging) → slider yeniden çizilir, öğeler aynı propslarla kalır.
    fireEvent(api.getByTestId('hero-scroller'), 'scrollBeginDrag');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('HeroSection on large screens', () => {
  const setWindow = (width: number, height: number) =>
    Dimensions.set({
      window: { width, height, scale: 2, fontScale: 2 },
      screen: { width, height, scale: 2, fontScale: 2 },
    });
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    setWindow(375, 667);
  });

  const imgOf = (api: ReturnType<typeof render>, id = 's1') => api.getByTestId(`hero-image-${id}`);
  const slideStyle = (api: ReturnType<typeof render>, id = 's1') =>
    StyleSheet.flatten(api.getByTestId(`hero-slide-${id}`).props.style);

  it('phone: image on top (16:10, mobile image), slide is a column', () => {
    const api = render(<HeroSection slides={[slide({ mobileImageUrl: 'https://cdn.example/m.jpg' })]} locale="tr" />);
    layout(api, 358);
    expect(slideStyle(api).flexDirection).toBeUndefined();
    expect([imgOf(api).props.source].flat()[0]).toEqual({ uri: 'https://cdn.example/m.jpg' });
  });

  it('iPad (820 pt): image beside the text, desktop image, half the page wide', () => {
    setWindow(820, 1180);
    const api = render(<HeroSection slides={[slide({ mobileImageUrl: 'https://cdn.example/m.jpg' })]} locale="tr" />);
    layout(api, 786);
    expect(slideStyle(api).flexDirection).toBe('row');
    expect([imgOf(api).props.source].flat()[0]).toEqual({ uri: 'https://cdn.example/a.jpg' });
    expect(StyleSheet.flatten(imgOf(api).props.style).width).toBe(393);
  });

  it('imageSide "right" puts the image after the text', () => {
    setWindow(1032, 1376);
    const api = render(<HeroSection slides={[slide({ imageSide: 'right' })]} locale="tr" />);
    layout(api, 998);
    expect(slideStyle(api).flexDirection).toBe('row-reverse');
    expect(StyleSheet.flatten(imgOf(api).props.style).width).toBe(480);
  });

  it('HeroReserved follows the split geometry on a tablet', () => {
    setWindow(1032, 1376);
    const api = render(<HeroReserved />);
    expect(StyleSheet.flatten(api.getByTestId('hero-reserved').props.style).height).toBeCloseTo(
      heroReservedHeight(1032),
      5,
    );
    expect(heroReservedHeight(1032)).toBeLessThan(400);
  });
});
