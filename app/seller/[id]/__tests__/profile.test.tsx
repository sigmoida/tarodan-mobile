/**
 * Satıcı profili (web SellerProfileClient): başlık kartı + sayaçlar, sekmeler (İlanlar / Değerlendirmeler /
 * Koleksiyonlar), bulunamadı durumu, kendi profilinde Mesaj/Takip yok.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
// Kartlardaki favori kalbi (`useProductCardFavorites`) React Query ister: provider'lı render.
import { renderWithProviders as render } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ id: 's1' }),
}));
jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));
jest.mock('@/components/UserActionsSheet', () => ({ __esModule: true, default: () => null }));

const mockProfile = jest.fn();
jest.mock('../_hooks/useSellerProfile', () => ({ useSellerProfile: () => mockProfile() }));

import SellerProfileScreen from '../index';

const base = () => ({
  isAuthenticated: true,
  isLoading: false,
  sellerId: 's1',
  isOwnProfile: false,
  seller: {
    id: 's1',
    displayName: 'Ali Veli',
    isVerified: true,
    followersCount: 3,
    stats: { totalListings: 2, totalSales: 5, totalTrades: 1, averageRating: 4.5, totalRatings: 2 },
  },
  products: [
    { id: 'p1', title: 'Ferrari F40', price: 100, images: [] },
    { id: 'p2', title: 'Supra', price: 80, images: [] },
  ],
  reviews: [{ id: 'r1', score: 5, comment: 'Harika satıcı', giver: { displayName: 'Mehmet' } }],
  collections: [{ id: 'c1', name: 'Garajım', itemCount: 4 }],
  ratingStats: null,
  activeTab: 'listings' as const,
  setActiveTab: jest.fn(),
  refreshing: false,
  onRefresh: jest.fn(),
  handleMessage: jest.fn(),
  isFollowingSeller: false,
  followBusy: false,
  handleToggleFollow: jest.fn(),
});

describe('satıcı profili', () => {
  beforeEach(() => mockProfile.mockReset());

  it('başlık kartı: ad, doğrulanmış rozeti, sayaçlar (İlanlar/Satış/Takas/Takipçi)', () => {
    mockProfile.mockReturnValue(base());
    render(<SellerProfileScreen />);
    expect(screen.getByText('Ali Veli')).toBeTruthy();
    expect(screen.getByText('Doğrulanmış')).toBeTruthy();
    expect(screen.getByText('Satış')).toBeTruthy();
    expect(screen.getByText('Takas')).toBeTruthy();
    expect(screen.getByText('Takipçi')).toBeTruthy();
    expect(screen.queryByText('4.5')).toBeNull(); // ortalama puan başlıkta değil, değerlendirmeler kartında
    expect(screen.getByText('3')).toBeTruthy(); // takipçi sayacı ızgarada
  });

  it('trust score: reads `trust` only, two decimals: "Güven skoru 3,74/5 · Orta"', () => {
    const f = base();
    mockProfile.mockReturnValue({
      ...f,
      seller: { ...f.seller, trust: { rating: 3.74, level: 'fair', formulaVersion: 1 } },
    });
    render(<SellerProfileScreen />);
    expect(screen.getByText('Güven skoru 3,74/5 · Orta')).toBeTruthy();
  });

  it('Premium badge only for a premium seller (web SellerHeader)', () => {
    const f = base();
    mockProfile.mockReturnValue(f);
    const first = render(<SellerProfileScreen />);
    expect(screen.queryByText('Premium')).toBeNull();
    first.unmount();
    mockProfile.mockReturnValue({ ...f, seller: { ...f.seller, isPremium: true } });
    render(<SellerProfileScreen />);
    expect(screen.getByText('Premium')).toBeTruthy();
  });

  it('new seller: "Güven skoru: Yeni satıcı"', () => {
    const f = base();
    mockProfile.mockReturnValue({
      ...f,
      seller: { ...f.seller, trust: { rating: null, level: 'new', formulaVersion: 1 } },
    });
    render(<SellerProfileScreen />);
    expect(screen.getByText('Güven skoru: Yeni satıcı')).toBeTruthy();
  });

  it('`trust` null or absent: no badge; the legacy trustScore/trustLevel never draw as /100', () => {
    const f = base();
    mockProfile.mockReturnValue({
      ...f,
      seller: { ...f.seller, isPremium: true, trust: null, trustScore: 75, trustLevel: 'Orta' },
    });
    const { unmount } = render(<SellerProfileScreen />);
    expect(screen.queryByTestId('seller-trust-badge')).toBeNull();
    expect(screen.queryByText(/\/100/)).toBeNull();
    unmount();
    mockProfile.mockReturnValue({ ...f, seller: { ...f.seller, isPremium: true, trustScore: 75, trustLevel: 'Orta' } });
    render(<SellerProfileScreen />);
    expect(screen.queryByTestId('seller-trust-badge')).toBeNull();
    expect(screen.queryByText(/\/100/)).toBeNull();
  });

  it('ilanlar sekmesi ProductCard ızgarası; sekme sayıları etikette', () => {
    mockProfile.mockReturnValue(base());
    render(<SellerProfileScreen />);
    expect(screen.getByText('Ferrari F40')).toBeTruthy();
    expect(screen.getByText('Supra')).toBeTruthy();
    expect(screen.getByLabelText('İlanlar (2)')).toBeTruthy();
    expect(screen.getByLabelText('Değerlendirmeler (1)')).toBeTruthy();
    expect(screen.getByLabelText('Koleksiyonlar (1)')).toBeTruthy();
  });

  it('sekmeye basınca setActiveTab', () => {
    const f = base();
    mockProfile.mockReturnValue(f);
    render(<SellerProfileScreen />);
    fireEvent.press(screen.getByLabelText('Koleksiyonlar (1)'));
    expect(f.setActiveTab).toHaveBeenCalledWith('collections');
  });

  it('değerlendirmeler ve koleksiyonlar sekmeleri içerik çizer', () => {
    mockProfile.mockReturnValue({ ...base(), activeTab: 'reviews' });
    const { unmount } = render(<SellerProfileScreen />);
    expect(screen.getByText('Harika satıcı')).toBeTruthy();
    unmount();
    mockProfile.mockReturnValue({ ...base(), activeTab: 'collections' });
    render(<SellerProfileScreen />);
    expect(screen.getByText('Garajım')).toBeTruthy();
  });

  it('boş ilan listesi için tek boş durum metni', () => {
    mockProfile.mockReturnValue({ ...base(), products: [] });
    render(<SellerProfileScreen />);
    expect(screen.getByText('Bu satıcının henüz aktif ilanı yok.')).toBeTruthy();
  });

  it('kendi profilinde Mesaj ve Takip düğmeleri yok', () => {
    mockProfile.mockReturnValue({ ...base(), isOwnProfile: true });
    render(<SellerProfileScreen />);
    expect(screen.queryByText('Takip Et')).toBeNull();
    expect(screen.queryByText('Mesaj')).toBeNull();
  });

  it('başka profilde Mesaj ve Takip Et çalışır', () => {
    const f = base();
    mockProfile.mockReturnValue(f);
    render(<SellerProfileScreen />);
    fireEvent.press(screen.getByText('Mesaj'));
    expect(f.handleMessage).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Takip Et'));
    expect(f.handleToggleFollow).toHaveBeenCalled();
  });

  it('satıcı bulunamazsa boş durum', () => {
    mockProfile.mockReturnValue({ ...base(), seller: null });
    render(<SellerProfileScreen />);
    expect(screen.getByText('Satıcı Bulunamadı')).toBeTruthy();
  });
});
