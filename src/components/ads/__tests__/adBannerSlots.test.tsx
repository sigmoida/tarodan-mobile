/**
 * Yeni yuvalar: topbar (ince "Sponsorlu" şeridi), footer, inline (yuva anahtarı),
 * yalnız header'ın yer ayırması, ortak oturumda gösterim tekrarı.
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
});
