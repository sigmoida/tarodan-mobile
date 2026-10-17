/**
 * AdBanner — ekrandaki reklam, paylaşılan reklam sorgusu yenilenip liste
 * uzunluğu değişse de listede kaldığı sürece SABİT kalır (aksi halde reklam
 * değişir ve yeni gösterim sayılırdı).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const mockUseAds = jest.fn();
jest.mock('@/hooks/useAds', () => ({
  useAds: (position: string) => mockUseAds(position),
}));

jest.mock('@/lib/api', () => ({
  adsApi: { recordImpression: jest.fn(() => Promise.resolve()), recordClick: jest.fn(() => Promise.resolve()) },
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: () => undefined }));

import { AdBanner } from '../AdBanner';

const ad = (id: string) => ({
  id,
  title: `T-${id}`,
  imageUrl: null,
  linkUrl: null,
  content: null,
  altText: null,
  width: null,
  height: null,
  position: 'header',
  deviceType: 'all',
});

const setAds = (...ids: string[]) =>
  mockUseAds.mockReturnValue({ ads: ids.map(ad), isAdFree: false, isLoading: false });

type View = ReturnType<typeof render>;
const shown = (v: View) => v.queryAllByTestId(/^ad-banner-[a-e]$/).map((n) => n.props.testID as string);

beforeEach(() => mockUseAds.mockReset());

describe('AdBanner — seçim sabit kalır', () => {
  it('liste uzunluğu değişse de ekrandaki reklam listede kaldığı sürece değişmez', () => {
    setAds('a', 'b', 'c');
    const view = render(<AdBanner position="header" />);
    const first = shown(view)[0]!;
    expect(first).toBeDefined();

    setAds('d', 'a', 'b', 'c', 'e');
    view.rerender(<AdBanner position="header" />);
    expect(shown(view)).toEqual([first]);

    setAds('c', 'a', 'b');
    view.rerender(<AdBanner position="header" />);
    expect(shown(view)).toEqual([first]);
  });

  it('seçilen reklam listeden düşerse yeniden seçilir', () => {
    setAds('a', 'b');
    const view = render(<AdBanner position="header" />);
    const first = shown(view)[0]!;
    const other = first === 'ad-banner-a' ? 'b' : 'a';

    setAds(other);
    view.rerender(<AdBanner position="header" />);
    expect(shown(view)).toEqual([`ad-banner-${other}`]);
  });
});
