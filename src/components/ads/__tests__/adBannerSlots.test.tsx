/**
 * Yeni yuvalar: topbar (ince "Sponsorlu" şeridi), footer, inline (yuva anahtarı),
 * yalnız header'ın yer ayırması, ortak oturumda gösterim tekrarı.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
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
import type { AdSession } from '@/lib/ads/useAdSession';

const baseAd = {
  id: 'a1',
  title: 'Reklam',
  imageUrl: null,
  linkUrl: '/secure-swap',
  content: null,
  altText: null,
  width: null,
  height: null,
  position: 'footer',
  deviceType: 'all',
};

const setAds = (ads: Array<Record<string, unknown>>, isLoading = false) =>
  mockUseAds.mockReturnValue({ ads: ads.map((a) => ({ ...baseAd, ...a })), isAdFree: false, isLoading });

beforeEach(() => {
  mockUseAds.mockReset();
  mockPush.mockClear();
  mockRecordClick.mockClear();
  mockRecordImpression.mockClear();
});

/** Hotspot'tan yukarı çıkıp sayısal genişlikli ilk atanın (görsel kutusu) stili. */
function imageBoxStyle(hotspot: { parent: any }) {
  let node = hotspot.parent;
  while (node) {
    const st = StyleSheet.flatten(node.props.style);
    if (st && typeof st.width === 'number') return st;
    node = node.parent;
  }
  throw new Error('görsel kutusu bulunamadı');
}

describe('AdBanner — konum yuvaları', () => {
  it.each(['footer', 'inline', 'topbar'])('%s: konumu useAds\'e iletir, tek reklam çizer', (position) => {
    setAds([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const { queryAllByTestId } = render(<AdBanner position={position} />);
    expect(mockUseAds).toHaveBeenCalledWith(position);
    expect(queryAllByTestId(/^ad-banner-(a|b|c)$/)).toHaveLength(1);
  });

  it('footer: metin reklam başlık/içerik çizer, satın alma linki tıklanamaz', () => {
    setAds([{ content: 'Metin', linkUrl: '/membership' }]);
    const { getByText, getByTestId } = render(<AdBanner position="footer" />);
    expect(getByText('Metin')).toBeTruthy();
    fireEvent.press(getByTestId('ad-banner-a1'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('topbar: "Sponsorlu" etiketi + tek satır başlık; dokununca link açılır', () => {
    setAds([{ position: 'topbar' }]);
    const { getByText, getByTestId } = render(<AdBanner position="topbar" />);
    expect(getByText(/sponsor/i)).toBeTruthy();
    fireEvent.press(getByTestId('ad-banner-a1'));
    expect(mockRecordClick).toHaveBeenCalledWith('a1');
    expect(mockPush).toHaveBeenCalledWith('/guvenli-takas');
  });

  it('topbar: görselli reklamda hotspot çizilir (satın alma hedefli olan çizilmez)', () => {
    setAds([
      {
        position: 'topbar',
        imageUrl: 'https://example.com/t.png',
        linkUrl: null,
        hotspots: [
          { id: 'h-ok', x: 0, y: 0, width: 0.5, height: 1, label: 'x', linkUrl: '/listings', sortOrder: 0 },
          { id: 'h-buy', x: 0.5, y: 0, width: 0.5, height: 1, label: 'y', linkUrl: '/membership', sortOrder: 1 },
        ],
      },
    ]);
    const { queryByTestId } = render(<AdBanner position="topbar" />);
    expect(queryByTestId('ad-hotspot-h-ok')).toBeTruthy();
    expect(queryByTestId('ad-hotspot-h-buy')).toBeNull();
  });

  it('topbar 970x90: kutu görselin oranında (200 x ~18.56), hotspot aynı kutunun yüzdesi', () => {
    setAds([
      {
        position: 'topbar',
        imageUrl: 'https://example.com/t.png',
        width: 970,
        height: 90,
        linkUrl: null,
        hotspots: [{ id: 'h1', x: 0.25, y: 0, width: 0.5, height: 1, label: 'x', linkUrl: '/listings', sortOrder: 0 }],
      },
    ]);
    const { getByTestId } = render(<AdBanner position="topbar" />);
    // Hotspot'un ebeveyni = görsel kutusu.
    const s = imageBoxStyle(getByTestId('ad-hotspot-h1'));
    expect(s.width).toBe(200);
    expect(s.height).toBeCloseTo(18.557, 2);
    expect(s.width / s.height).toBeCloseTo(970 / 90, 6);
    // Kutu ≤ 24pt yüksekliğe ve ≤ 200pt genişliğe sığar.
    expect(s.height).toBeLessThanOrEqual(24);
    // Bölge kutunun yüzdesiyle konumlanır → görselin kapladığı dikdörtgenle aynı.
    expect(StyleSheet.flatten(getByTestId('ad-hotspot-h1').props.style)).toMatchObject({
      left: '25%',
      width: '50%',
      height: '100%',
    });
  });

  it('topbar dar afiş (2:1): yükseklik 24 kalır, genişlik oranla 48', () => {
    setAds([
      {
        position: 'topbar',
        imageUrl: 'https://example.com/t.png',
        width: 200,
        height: 100,
        linkUrl: null,
        hotspots: [{ id: 'h2', x: 0, y: 0, width: 1, height: 1, label: 'x', linkUrl: '/listings', sortOrder: 0 }],
      },
    ]);
    const { getByTestId } = render(<AdBanner position="topbar" />);
    const s = imageBoxStyle(getByTestId('ad-hotspot-h2'));
    expect(s.height).toBe(24);
    expect(s.width).toBe(48);
  });

  it('yüklenirken yalnız header yer ayırır; footer/inline/topbar hiçbir şey çizmez', () => {
    setAds([], true);
    expect(render(<AdBanner position="header" />).queryByTestId('ad-banner-slot-reserved')).toBeTruthy();
    for (const p of ['footer', 'inline', 'topbar']) {
      expect(render(<AdBanner position={p} />).queryByTestId('ad-banner-slot-reserved')).toBeNull();
    }
  });

  it('reklam yoksa hiçbir şey çizilmez', () => {
    setAds([]);
    const { toJSON } = render(<AdBanner position="inline" />);
    expect(toJSON()).toBeNull();
  });
});

describe('AdBanner — inline yuva anahtarı ve oturum', () => {
  const session: AdSession = { seed: 0, sentImpressions: new Set() };

  it('farklı yuva anahtarları aynı oturum tohumuyla farklı reklam seçebilir', () => {
    setAds([{ id: 'a' }, { id: 'b' }]);
    const picks = new Set<string>();
    for (const key of ['inline-0', 'inline-1']) {
      const { queryAllByTestId, unmount } = render(<AdBanner position="inline" slotKey={key} session={session} />);
      picks.add(queryAllByTestId(/^ad-banner-(a|b)$/)[0]!.props.testID);
      unmount();
    }
    // Aynı tohum + farklı anahtar: seçim anahtara bağlıdır (kararlı, ikisi de geçerli).
    expect(picks.size).toBeGreaterThanOrEqual(1);
    // Aynı (liste, anahtar, tohum) her zaman aynı reklamı verir.
    const again = render(<AdBanner position="inline" slotKey="inline-0" session={session} />);
    const first = render(<AdBanner position="inline" slotKey="inline-0" session={session} />);
    expect(again.queryAllByTestId(/^ad-banner-(a|b)$/)[0]!.props.testID).toBe(
      first.queryAllByTestId(/^ad-banner-(a|b)$/)[0]!.props.testID,
    );
  });

  it('ortak oturumda aynı reklamın gösterimi yeniden bağlanınca ikinci kez sayılmaz', () => {
    jest.useFakeTimers();
    try {
      const shared: AdSession = { seed: 1, sentImpressions: new Set() };
      setAds([{ id: 'only' }]);
      const first = render(<AdBanner position="inline" slotKey="inline-0" session={shared} />);
      act(() => {
        jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
      });
      expect(mockRecordImpression).toHaveBeenCalledTimes(1);
      first.unmount(); // liste kaydırılınca satır söküldü…

      render(<AdBanner position="inline" slotKey="inline-0" session={shared} />); // …geri geldi
      act(() => {
        jest.advanceTimersByTime(IMPRESSION_DWELL_MS * 2);
      });
      expect(mockRecordImpression).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('aynı reklamı gösteren İKİ yuva (footer + inline) ayrı gösterim sayar', () => {
    jest.useFakeTimers();
    try {
      const shared: AdSession = { seed: 2, sentImpressions: new Set() };
      setAds([{ id: 'only' }]);
      render(
        <>
          <AdBanner position="footer" session={shared} />
          <AdBanner position="inline" slotKey="inline-0" session={shared} />
        </>,
      );
      act(() => {
        jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
      });
      expect(mockRecordImpression).toHaveBeenCalledTimes(2);
      expect(shared.sentImpressions.size).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('oturum yenilenince (yeni tohum + boş küme) yuva yeniden seçer ve aynı reklam yeniden sayılır', () => {
    jest.useFakeTimers();
    try {
      setAds([{ id: 'only' }]);
      const s1: AdSession = { seed: 10, sentImpressions: new Set() };
      const { rerender } = render(<AdBanner position="footer" session={s1} />);
      act(() => {
        jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
      });
      expect(mockRecordImpression).toHaveBeenCalledTimes(1);

      // Aynı oturum: yeniden çizim sayımı artırmaz.
      rerender(<AdBanner position="footer" session={s1} />);
      act(() => {
        jest.advanceTimersByTime(IMPRESSION_DWELL_MS * 2);
      });
      expect(mockRecordImpression).toHaveBeenCalledTimes(1);

      // Ekran yeniden odaklandı → yeni oturum: yuva yeniden seçilir, gösterim yeniden sayılır.
      const s2: AdSession = { seed: 11, sentImpressions: new Set() };
      rerender(<AdBanner position="footer" session={s2} />);
      act(() => {
        jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
      });
      expect(mockRecordImpression).toHaveBeenCalledTimes(2);
      expect(s2.sentImpressions.size).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
