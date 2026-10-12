/**
 * D-4.3/4.4: ana sayfa hero'su API'den gelir. Yüklenirken rezerve alan, görünür
 * slayt yoksa statik yedek; CTA'lar paylaşılan openAdLink ile açılır, tıklama
 * `?cta=` ile TEK istek olarak sayılır, gösterim görünürlükte (mount'ta değil).
 */
import React from 'react';
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
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: (...a: unknown[]) => mockPush(...a) },
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => cb(), [cb]);
    },
  };
});

jest.mock('../HomeSections', () => {
  const { Text } = require('react-native');
  return { HeroBanner: () => <Text>STATIC_HERO</Text> };
});

import { HeroSection } from '../HeroSlider';
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

const layout = (api: ReturnType<typeof render>) =>
  fireEvent(api.getByTestId('hero-slider'), 'layout', { nativeEvent: { layout: { width: 320, height: 400 } } });

describe('HeroSection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRecordClick.mockClear();
    mockRecordImpression.mockClear();
    mockPush.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('yüklenirken rezerve alan çizer, statik hero çizmez', () => {
    const api = render(<HeroSection slides={[]} locale="tr" isLoading />);
    expect(api.getByTestId('hero-reserved')).toBeTruthy();
    expect(api.queryByText('STATIC_HERO')).toBeNull();
  });

  it('görünür slayt yoksa statik hero', () => {
    const api = render(<HeroSection slides={[]} locale="tr" />);
    expect(api.getByText('STATIC_HERO')).toBeTruthy();
    expect(api.queryByTestId('hero-slider')).toBeNull();
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
    expect(mockPush).toHaveBeenCalledWith('/listings?manufacturer=Hot+Wheels');
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
});
