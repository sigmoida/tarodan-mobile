/**
 * J30/J106 · Koleksiyon detayı — mobil UI dilimi.
 * Render (ad/açıklama/istatistik), paylaş + beğeni butonu varlığı, beğeni optimistic artışı,
 * giriş yapılmamışsa beğeni → login'e yönlendirme, sahiplik: yabancıda düzenle butonu gizli,
 * koleksiyon bulunamadı durumu.
 * Backend: like kalıcılığı, viewCount artışı, share sayacı backend-only.
 */
import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Share } from 'react-native';
import { renderWithProviders } from '@/test-utils';
import { toast } from '@/ui';

jest.mock('@/lib/clipboard', () => ({ copyToClipboard: jest.fn(() => true) }));
import { copyToClipboard } from '@/lib/clipboard';

let mockParams: Record<string, string> = { id: 'col-1' };
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: mockBack, canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  collectionsApi: { like: jest.fn(), unlike: jest.fn() },
}));
import { api } from '@/lib/api';

let mockAuth: Record<string, unknown> = {
  isAuthenticated: true,
  user: { id: 'owner-1', membershipTier: 'free' },
};
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuth;
    return sel ? sel(state) : state;
  },
}));

import CollectionDetailScreen from '../index';

const getMock = api.get as jest.Mock;

function collectionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'col-1',
    name: 'Ferrari Koleksiyonum',
    description: 'En sevdiğim modeller',
    userId: 'owner-1',
    userName: 'Mehmet',
    itemCount: 3,
    viewCount: 42,
    likeCount: 5,
    shareCount: 2,
    isLiked: false,
    items: [],
    ...overrides,
  };
}

describe('J30 · Koleksiyon detayı render + paylaş/beğeni', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockPush.mockClear();
    mockParams = { id: 'col-1' };
    mockAuth = { isAuthenticated: true, user: { id: 'owner-1', membershipTier: 'free' } };
  });

  it('J30.1 koleksiyon adı ve açıklaması gösterilir', async () => {
    getMock.mockResolvedValue({ data: { data: collectionFixture() } });
    renderWithProviders(<CollectionDetailScreen />);
    await waitFor(() =>
      expect(screen.getByText('Ferrari Koleksiyonum')).toBeOnTheScreen(),
    );
    expect(screen.getByText('En sevdiğim modeller')).toBeOnTheScreen();
    expect(screen.getByText('42 görüntüleme')).toBeOnTheScreen();
  });

  it('J30.2 paylaş/beğen/şikayet üst barın sağında (ürün detayı gibi); sahip çipi başlık kartında, adın altında', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'viewer-9', membershipTier: 'free' } };
    getMock.mockResolvedValue({ data: { data: collectionFixture({ likeCount: 5 }) } });
    renderWithProviders(<CollectionDetailScreen />);
    await waitFor(() => expect(screen.getByText('5 beğeni')).toBeOnTheScreen());
    const bar = screen.getByTestId('screen-header-right');
    const actions = screen.getByTestId('collection-actions');
    expect(within(bar).getByTestId('collection-actions')).toBe(actions);
    expect(within(actions).getByLabelText('Paylaş')).toBeOnTheScreen();
    expect(within(actions).getByLabelText('beğeni')).toBeOnTheScreen();
    expect(within(actions).getByLabelText('Koleksiyonu Şikayet Et')).toBeOnTheScreen();
    const header = screen.getByTestId('collection-header');
    expect(within(header).queryByTestId('collection-actions')).toBeNull();
    expect(within(header).getByTestId('collection-owner-chip')).toBeOnTheScreen();
    // Üst barda koleksiyon adı yok.
    expect(within(screen.getByTestId('screen-header')).queryByText('Ferrari Koleksiyonum')).toBeNull();
  });

  it('J30.3 sahip yalnız paylaş görür (beğen/şikayet yok)', async () => {
    getMock.mockResolvedValue({ data: { data: collectionFixture({ userId: 'owner-1' }) } });
    renderWithProviders(<CollectionDetailScreen />);
    const actions = await screen.findByTestId('collection-actions');
    expect(within(actions).getByLabelText('Paylaş')).toBeOnTheScreen();
    expect(within(actions).queryByLabelText('beğeni')).toBeNull();
    expect(within(actions).queryByLabelText('Koleksiyonu Şikayet Et')).toBeNull();
  });

  it('J30.4 koleksiyon bulunamazsa boş durum gösterilir', async () => {
    getMock.mockResolvedValue({ data: null });
    renderWithProviders(<CollectionDetailScreen />);
    expect(await screen.findByText('Koleksiyon bulunamadı')).toBeOnTheScreen();
  });
});

describe('J106 · Sahiplik kontrolü (düzenle butonu)', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockPush.mockClear();
    mockParams = { id: 'col-1' };
  });

  it('J106.1 sahip ise üst barda düzenle (kalem) + ürün ekle (artı) görünür, içerikte düğme yok', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'owner-1', membershipTier: 'free' } };
    const items = [{ id: 'i1', productId: 'p1', productTitle: 'Ferrari F40', productPrice: 100 }];
    getMock.mockResolvedValue({ data: { data: collectionFixture({ userId: 'owner-1', items }) } });
    renderWithProviders(<CollectionDetailScreen />);
    const edit = await screen.findByTestId('collection-edit-button');
    const add = screen.getByTestId('collection-add-items-button');
    expect(screen.queryByText('Ürün Ekle')).toBeNull();
    expect(screen.queryByText('Düzenle')).toBeNull();
    expect(screen.queryByTestId('collection-like-button')).toBeNull();
    fireEvent.press(edit);
    expect(mockPush).toHaveBeenCalledWith('/collections/col-1/edit');
    fireEvent.press(add);
    expect(mockPush).toHaveBeenCalledWith('/collections/col-1/add-items');
  });

  it('J106.2 yabancı kullanıcıda sahip kontrolleri gizli', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'stranger-9', membershipTier: 'free' } };
    getMock.mockResolvedValue({ data: { data: collectionFixture({ userId: 'owner-1' }) } });
    renderWithProviders(<CollectionDetailScreen />);
    await waitFor(() => expect(screen.getByText('Ferrari Koleksiyonum')).toBeOnTheScreen());
    expect(screen.queryByTestId('collection-edit-button')).toBeNull();
    expect(screen.queryByTestId('collection-add-items-button')).toBeNull();
  });

  it('başkasının koleksiyonundaki kendi ilanım için kart kalbi çizilmez; diğer kalemlerde durur', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'stranger-9', membershipTier: 'free' } };
    const items = [
      { id: 'i1', productId: 'p-mine', productTitle: 'Benim', productPrice: 10, sellerId: 'stranger-9' },
      { id: 'i2', productId: 'p-nested', productTitle: 'İç içe', productPrice: 10, seller: { id: 'stranger-9' } },
      { id: 'i3', productId: 'p-other', productTitle: 'Başkası', productPrice: 10, sellerId: 'someone-else' },
    ];
    getMock.mockImplementation(async (url: string) =>
      String(url).includes('favorites')
        ? { data: { data: [] } }
        : { data: { data: collectionFixture({ userId: 'owner-1', items }) } },
    );
    renderWithProviders(<CollectionDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('product-card-favorite-p-other')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-card-favorite-p-mine')).toBeNull();
    expect(screen.queryByTestId('product-card-favorite-p-nested')).toBeNull();
  });
});

/**
 * Misafir koleksiyonu şikayet ederse ReportModal açılıyor, POST /user-reports
 * 401 dönüyor ve 401 interceptor'ı Modal açıkken oturumu kapatıp login'e
 * atıyordu (iOS donma — src/ui/CLAUDE.md › iOS modal rule). Ürün sayfasıyla aynı: önce giriş.
 */
describe('Koleksiyon şikayeti · misafir', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockParams = { id: 'col-1' };
    mockAuth = { isAuthenticated: false, user: null };
  });

  it('şikayet penceresi yerine giriş uyarısı gösterir', async () => {
    const { appAlert } = jest.requireMock('@/ui') as { appAlert: jest.Mock };
    appAlert.mockClear();
    getMock.mockResolvedValue({ data: collectionFixture() });
    renderWithProviders(<CollectionDetailScreen />);
    fireEvent.press(await screen.findByLabelText('Koleksiyonu Şikayet Et'));
    expect(appAlert).toHaveBeenCalledWith(expect.any(String), 'Raporlamak için giriş yapmalısınız', expect.any(Array));
    expect(screen.queryByText('Koleksiyonu Şikayet Et')).toBeNull();
  });
});

/** Web `handleShare`: paylaşım açılamazsa link panoya + "Link kopyalandı"; o da olmazsa hata toast'ı. */
describe('Koleksiyon paylaşımı', () => {
  const copyMock = copyToClipboard as jest.Mock;
  let shareSpy: jest.SpyInstance;
  let successSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    getMock.mockReset();
    copyMock.mockReset();
    mockParams = { id: 'col-1' };
    mockAuth = { isAuthenticated: true, user: { id: 'viewer-9', membershipTier: 'free' } };
    getMock.mockResolvedValue({ data: { data: collectionFixture() } });
    shareSpy = jest.spyOn(Share, 'share');
    successSpy = jest.spyOn(toast, 'success').mockImplementation(() => 'id');
    errorSpy = jest.spyOn(toast, 'error').mockImplementation(() => 'id');
  });
  afterEach(() => {
    shareSpy.mockRestore();
    successSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('paylaşım sayfası açılırsa link kopyalanmaz, toast yok', async () => {
    shareSpy.mockResolvedValue({ action: Share.sharedAction });
    renderWithProviders(<CollectionDetailScreen />);
    fireEvent.press(await screen.findByTestId('collection-share-button'));
    await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));
    expect(String(shareSpy.mock.calls[0][0].message)).toContain('/collections/col-1');
    expect(copyMock).not.toHaveBeenCalled();
    expect(successSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('paylaşım başarısızsa link panoya kopyalanır + "Link kopyalandı"', async () => {
    shareSpy.mockRejectedValue(new Error('unavailable'));
    copyMock.mockReturnValue(true);
    renderWithProviders(<CollectionDetailScreen />);
    fireEvent.press(await screen.findByTestId('collection-share-button'));
    await waitFor(() => expect(successSpy).toHaveBeenCalledWith('Link kopyalandı'));
    expect(copyMock).toHaveBeenCalledWith(expect.stringContaining('/collections/col-1'));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('paylaşım ve kopyalama başarısızsa hata toast\'ı (sessiz yutma yok)', async () => {
    shareSpy.mockRejectedValue(new Error('unavailable'));
    copyMock.mockReturnValue(false);
    renderWithProviders(<CollectionDetailScreen />);
    fireEvent.press(await screen.findByTestId('collection-share-button'));
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Link kopyalanamadı'));
    expect(successSpy).not.toHaveBeenCalled();
  });
});
