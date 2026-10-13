/**
 * AdBanner — tek reklam (rotasyon), metin reklam, görsel oranı/hotspot hizası,
 * link kapısı ve iki API şekli (prod: hotspot yok + linkUrl dolu; development:
 * hotspot var + görselli reklamda linkUrl null).
 */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockUseAds = jest.fn();
jest.mock('@/hooks/useAds', () => ({
  useAds: (position: string) => mockUseAds(position),
}));

const mockRecordClick = jest.fn(() => Promise.resolve());
const mockRecordImpression = jest.fn(() => Promise.resolve());
jest.mock('@/lib/api', () => ({
  adsApi: {
    recordImpression: (...a: unknown[]) => mockRecordImpression(...(a as [])),
    recordClick: (...a: unknown[]) => mockRecordClick(...(a as [])),
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: (...a: unknown[]) => mockPush(...a) },
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => cb(), [cb]);
    },
  };
});

import { AdBanner } from '../AdBanner';
import { IMPRESSION_DWELL_MS } from '@/lib/ads/useAdImpression';

const baseAd = {
  id: 'ad-1',
  title: 'Leaderboard',
  imageUrl: 'https://example.com/a.png',
  linkUrl: null,
  content: null,
  altText: null,
  width: 320,
  height: 50,
  position: 'header',
  deviceType: 'all',
};

const hotspot = (over: Record<string, unknown> = {}) => ({
  id: 'h-1', x: 0, y: 0, width: 1, height: 1, label: 'Tümü', linkUrl: '/listings', sortOrder: 0, ...over,
});

const setAds = (...ads: Array<Record<string, unknown>>) =>
  mockUseAds.mockReturnValue({
    ads: ads.map((a) => ({ ...baseAd, ...a })),
    isAdFree: false,
    isLoading: false,
  });

beforeEach(() => {
  mockUseAds.mockReset();
  mockPush.mockClear();
  mockRecordClick.mockClear();
  mockRecordImpression.mockClear();
});

describe('AdBanner — yuvada TEK reklam', () => {
  it('birden çok reklam olsa da yalnız biri çizilir', () => {
    setAds({ id: 'a' }, { id: 'b' }, { id: 'c' });
    const { queryAllByTestId } = render(<AdBanner position="header" />);
    expect(queryAllByTestId(/^ad-banner-(a|b|c)$/)).toHaveLength(1);
  });

  it('yeniden çizimde seçim sabit kalır (sıçramaz)', () => {
    setAds({ id: 'a' }, { id: 'b' }, { id: 'c' });
    const { queryAllByTestId, rerender } = render(<AdBanner position="header" />);
    const first = queryAllByTestId(/^ad-banner-(a|b|c)$/)[0]!.props.testID;
    rerender(<AdBanner position="header" />);
    expect(queryAllByTestId(/^ad-banner-(a|b|c)$/)[0]!.props.testID).toBe(first);
  });

  it('ekran her açıldığında (yeni bağlanış) dönüşüm olur', () => {
    setAds({ id: 'a' }, { id: 'b' }, { id: 'c' });
    const seen = new Set<string>();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    for (const r of [0, 0.34, 0.67]) {
      (Math.random as jest.Mock).mockReturnValue(r);
      const { queryAllByTestId, unmount } = render(<AdBanner position="header" />);
      seen.add(queryAllByTestId(/^ad-banner-(a|b|c)$/)[0]!.props.testID);
      unmount();
    }
    (Math.random as jest.Mock).mockRestore();
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('AdBanner — metin (görselsiz) reklam', () => {
  it('başlık, içerik ve kupon kodunu çizer', () => {
    setAds({
      imageUrl: null,
      title: 'Komisyonsuz alışveriş',
      content: 'Bu hafta sonu geçerli',
      campaign: { id: 'c1', name: 'K', code: 'KOMISYONSUZ', target: 'all' },
    });
    const { getByText, getByTestId, queryByTestId } = render(<AdBanner />);
    expect(getByText('Komisyonsuz alışveriş')).toBeTruthy();
    expect(getByText('Bu hafta sonu geçerli')).toBeTruthy();
    expect(getByText('KOMISYONSUZ')).toBeTruthy();
    expect(getByTestId('ad-text-ad-1')).toBeTruthy();
    expect(queryByTestId('ad-flash-countdown')).toBeNull();
  });

  it('flaş kampanyada geri sayım gösterir; süresi bitmişse göstermez', () => {
    const future = new Date(Date.now() + 2 * 3600_000 + 5000).toISOString();
    setAds({
      imageUrl: null,
      campaign: { id: 'c1', name: 'K', code: null, target: 'all', isFlashSale: true, endsAt: future },
    });
    const { getByTestId, unmount } = render(<AdBanner />);
    expect(getByTestId('ad-flash-countdown')).toBeTruthy();
    unmount();

    setAds({
      imageUrl: null,
      campaign: {
        id: 'c1', name: 'K', code: null, target: 'all', isFlashSale: true,
        endsAt: new Date(Date.now() - 1000).toISOString(),
      },
    });
    expect(render(<AdBanner />).queryByTestId('ad-flash-countdown')).toBeNull();
  });

  it('linkUrl varsa tüm reklam tıklanır ve tıklama sayılır; satın alma linkinde tıklanmaz', () => {
    setAds({ imageUrl: null, linkUrl: '/secure-swap' });
    const first = render(<AdBanner />);
    fireEvent.press(first.getByTestId('ad-banner-ad-1'));
    expect(mockRecordClick).toHaveBeenCalledWith('ad-1');
    expect(mockPush).toHaveBeenCalledWith('/guvenli-takas');
    first.unmount();

    mockPush.mockClear();
    mockRecordClick.mockClear();
    setAds({ imageUrl: null, linkUrl: '/membership' });
    const second = render(<AdBanner />);
    fireEvent.press(second.getByTestId('ad-banner-ad-1'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRecordClick).not.toHaveBeenCalled();
  });

  it('kampanyasız (eski API: campaign alanı yok) metin reklam hatasız çizilir', () => {
    setAds({ imageUrl: null, title: 'Duyuru' });
    expect(render(<AdBanner />).getByText('Duyuru')).toBeTruthy();
  });
});

describe('AdBanner — görsel oranı ve hotspot hizası', () => {
  it('kutu kayıtlı orana göre açılır, görsel yüklenince GERÇEK oranı alır; görsel kırpılmaz', () => {
    setAds({ width: 1200, height: 300, hotspots: [hotspot()] });
    const { UNSAFE_getByType, UNSAFE_getAllByType } = render(<AdBanner />);
    const { Image } = require('expo-image');
    const { View } = require('react-native');
    const image = UNSAFE_getByType(Image);

    expect(image.props.contentFit).toBe('contain');
    const ratioOf = () => {
      const ratios = UNSAFE_getAllByType(View)
        .map((v: any) => Object.assign({}, ...([] as any[]).concat(v.props.style).flat(Infinity).filter(Boolean)))
        .map((st: any) => st.aspectRatio)
        .filter((r: unknown) => typeof r === 'number');
      return ratios[0];
    };
    expect(ratioOf()).toBe(4);

    act(() => {
      image.props.onLoad({ source: { width: 970, height: 250 } });
    });
    expect(ratioOf()).toBeCloseTo(970 / 250);
  });

  it('hotspot yüzde konumlanır ve dokunuş payı (hitSlop) vardır', () => {
    setAds({ hotspots: [hotspot({ x: 0.25, y: 0.1, width: 0.5, height: 0.8 })] });
    const { getByTestId } = render(<AdBanner />);
    const node = getByTestId('ad-hotspot-h-1');
    const style = Object.assign({}, ...([] as any[]).concat(node.props.style).filter(Boolean));
    expect(style).toMatchObject({ position: 'absolute', left: '25%', top: '10%', width: '50%', height: '80%' });
    expect(node.props.hitSlop).toBeGreaterThan(0);
  });
});

describe('AdBanner — iki API şekli', () => {
  it('prod şekli: hotspots alanı YOK + linkUrl dolu → tüm görsel tıklanır', () => {
    setAds({ linkUrl: '/listings?manufacturer=Hot+Wheels' }); // hotspots anahtarı hiç yok
    const { getByTestId } = render(<AdBanner />);
    fireEvent.press(getByTestId('ad-banner-ad-1'));
    expect(mockRecordClick).toHaveBeenCalledWith('ad-1');
    expect(mockPush).toHaveBeenCalledWith('/listings?manufacturer=Hot+Wheels');
  });

  it('development şekli: görselli reklam linkUrl:null + hotspots[] → yalnız bölgeler tıklanır', () => {
    setAds({ linkUrl: null, hotspots: [hotspot({ x: 0.5, width: 0.5, linkUrl: '/secure-swap' })] });
    const { getByTestId } = render(<AdBanner />);

    fireEvent.press(getByTestId('ad-banner-ad-1'));
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('ad-hotspot-h-1'));
    expect(mockRecordClick).toHaveBeenCalledWith('ad-1', 'h-1');
    expect(mockPush).toHaveBeenCalledWith('/guvenli-takas');
  });

  it('development şekli: boş hotspots[] + linkUrl:null → hiçbir şey tıklanmaz, çökmez', () => {
    setAds({ linkUrl: null, hotspots: [] });
    const { getByTestId } = render(<AdBanner />);
    fireEvent.press(getByTestId('ad-banner-ad-1'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRecordClick).not.toHaveBeenCalled();
  });
});

describe('AdBanner — satın alma kapısı', () => {
  it('satın almaya götüren hotspot çizilmez', () => {
    setAds({ hotspots: [hotspot({ linkUrl: '/membership' })] });
    expect(render(<AdBanner />).queryByTestId('ad-hotspot-h-1')).toBeNull();
  });

  it('eşlenemeyen site yolu bilinmeyen rotaya push edilmez, uygulama içi web ekranına gider', () => {
    setAds({ hotspots: [hotspot({ linkUrl: '/yeni-kampanya' })] });
    fireEvent.press(render(<AdBanner />).getByTestId('ad-hotspot-h-1'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0]![0]).toMatch(/^\/in-app-web\?url=/);
  });
});

describe('AdBanner — gösterim', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('mount anında değil; görsel yüklenip bekleme süresi dolunca bir kez sayılır', () => {
    setAds({ hotspots: [hotspot()] });
    const { UNSAFE_getByType } = render(<AdBanner />);
    const { Image } = require('expo-image');

    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS * 2);
    });
    expect(mockRecordImpression).not.toHaveBeenCalled(); // görsel henüz yüklenmedi

    act(() => {
      UNSAFE_getByType(Image).props.onLoad({ source: { width: 320, height: 50 } });
    });
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
    });
    expect(mockRecordImpression).toHaveBeenCalledTimes(1);
    expect(mockRecordImpression).toHaveBeenCalledWith('ad-1');
  });

  it('metin reklam yükleme beklemez', () => {
    setAds({ imageUrl: null });
    render(<AdBanner />);
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
    });
    expect(mockRecordImpression).toHaveBeenCalledWith('ad-1');
  });
});
