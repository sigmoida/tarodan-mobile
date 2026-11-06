/**
 * J30/J106 · Koleksiyon detayı — mobil UI dilimi.
 * Render (ad/açıklama/istatistik), paylaş + beğeni butonu varlığı, beğeni optimistic artışı,
 * giriş yapılmamışsa beğeni → login'e yönlendirme, sahiplik: yabancıda düzenle butonu gizli,
 * koleksiyon bulunamadı durumu.
 * Backend: like kalıcılığı, viewCount artışı, share sayacı backend-only.
 */
import React from 'react';
import { screen, fireEvent, waitFor, within, act } from '@testing-library/react-native';
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

// `GET /collections/:id` (collectionsApi.getOne) and the favourites call share one `get` mock, so a
// test answers both by URL.
const mockGet = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
  collectionsApi: {
    getOne: (id: string) => mockGet(`/collections/${id}`),
    like: jest.fn(),
    unlike: jest.fn(),
    removeItem: jest.fn(),
  },
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));
import { collectionsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { appAlert } from '@/ui';
jest.mock('@/services/sentry', () => ({ ...jest.requireActual('@/services/sentry'), captureException: jest.fn() }));
import { captureException } from '@/services/sentry';

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

const getMock = mockGet;

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
  });
});

/**
 * Custom items (hub plan 2026-11-06-collection-custom-items, web parity): "Satışta değil" in the
 * price row instead of "0,00 TL", the "Koleksiyon" badge, not tappable, no heart. A sold listing
 * gets the "Satıldı" badge instead of the out-of-stock overlay.
 */
describe('collection items: custom items and the sold badge', () => {
  const custom = {
    id: 'c1',
    productTitle: 'Benim modelim',
    customTitle: 'Benim modelim',
    customBrand: 'Ferrari',
    customImageUrl: 'https://cdn.example.test/collections/c1.jpg',
    sellerId: null,
    isCustom: true,
    isFeatured: false,
    sortOrder: 1,
    addedAt: '2026-11-01T00:00:00.000Z',
  };
  const listing = {
    id: 'l1',
    productId: 'p-live',
    productTitle: 'Satıştaki ilan',
    productPrice: 250,
    productStatus: 'active',
    sellerId: 'someone-else',
    isCustom: false,
    isFeatured: false,
    sortOrder: 2,
    addedAt: '2026-11-01T00:00:00.000Z',
  };
  const sold = { ...listing, id: 's1', productId: 'p-sold', productTitle: 'Satılmış ilan', productStatus: 'sold', sortOrder: 3 };

  function renderWith(items: unknown[]) {
    getMock.mockImplementation(async (url: string) =>
      String(url).includes('favorites')
        ? { data: { data: [] } }
        : { data: { data: collectionFixture({ userId: 'owner-1', items }) } },
    );
    renderWithProviders(<CollectionDetailScreen />);
  }

  beforeEach(() => {
    getMock.mockReset();
    mockPush.mockClear();
    mockParams = { id: 'col-1' };
    mockAuth = { isAuthenticated: true, user: { id: 'viewer-9', membershipTier: 'free' } };
  });

  it('a custom item shows "Satışta değil" and the "Koleksiyon" badge, never "0,00 TL"', async () => {
    renderWith([custom]);
    const card = await screen.findByTestId('collection-item-c1');
    expect(within(card).getByText('Satışta değil')).toBeOnTheScreen();
    expect(screen.getByText('Koleksiyon')).toBeOnTheScreen();
    expect(screen.queryByText(/0,00 TL/)).toBeNull();
    expect(screen.queryByTestId('product-card-price')).toBeNull();
  });

  it('a custom item is not a button, a tap does nothing, and it has no heart', async () => {
    renderWith([custom, listing]);
    const card = await screen.findByTestId('collection-item-c1');
    expect(card.props.accessibilityRole).toBeUndefined();
    expect(card.props.accessibilityLabel).toBe('Benim modelim, Satışta değil');
    expect(screen.queryByRole('button', { name: /Benim modelim/ })).toBeNull();
    fireEvent.press(card);
    expect(mockPush).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('product-card-favorite-p-live')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-card-favorite-c1')).toBeNull();
  });

  it('a listing keeps its price, opens its detail and has no badge', async () => {
    renderWith([listing]);
    const card = await screen.findByRole('button', { name: 'Satıştaki ilan' });
    expect(screen.getByTestId('product-card-price').props.children).toBe('250,00 TL');
    expect(screen.queryByText('Satışta değil')).toBeNull();
    expect(screen.queryByText('Koleksiyon')).toBeNull();
    expect(screen.queryByText('Satıldı')).toBeNull();
    fireEvent.press(card);
    expect(mockPush).toHaveBeenCalledWith('/product/p-live');
  });

  it('a sold listing shows the "Satıldı" badge, not the out-of-stock overlay', async () => {
    renderWith([sold]);
    await screen.findByTestId('collection-item-s1');
    expect(screen.getByText('Satıldı')).toBeOnTheScreen();
    expect(screen.queryByText('STOKTA YOK')).toBeNull();
  });

  it('hidden or deleted listings are dropped; featured items come first, then sortOrder (web)', async () => {
    const hidden = { ...listing, id: 'h1', productId: 'p-hidden', productTitle: 'Gizli ilan', productStatus: 'pending', sortOrder: 0 };
    const featured = { ...sold, isFeatured: true };
    renderWith([listing, hidden, custom, featured]);
    await screen.findByTestId('collection-item-s1');
    expect(screen.queryByText('Gizli ilan')).toBeNull();
    const order = screen.getAllByTestId(/^collection-item-/).map((node) => node.props.testID);
    expect(order).toEqual(['collection-item-s1', 'collection-item-c1', 'collection-item-l1']);
  });
});

/**
 * Owner removes an item (hub plan 2026-11-06-collection-custom-items, web parity): a trash control on
 * every card, a confirm dialog, `DELETE /collections/:id/items/:itemId`, a toast and a refresh.
 * Visitors get no control.
 */
describe('collection items: owner removal', () => {
  const custom = {
    id: 'c1',
    productTitle: 'Benim modelim',
    customTitle: 'Benim modelim',
    sellerId: null,
    isCustom: true,
    isFeatured: false,
    sortOrder: 1,
    addedAt: '2026-11-01T00:00:00.000Z',
  };
  const listing = {
    id: 'l1',
    productId: 'p-live',
    productTitle: 'Satıştaki ilan',
    productPrice: 250,
    productStatus: 'active',
    sellerId: 'owner-1',
    isCustom: false,
    isFeatured: false,
    sortOrder: 2,
    addedAt: '2026-11-01T00:00:00.000Z',
  };
  const removeItem = collectionsApi.removeItem as jest.Mock;
  let successSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  function renderWith(items: unknown[]) {
    getMock.mockImplementation(async (url: string) =>
      String(url).includes('favorites')
        ? { data: { data: [] } }
        : { data: { data: collectionFixture({ userId: 'owner-1', items }) } },
    );
    return renderWithProviders(<CollectionDetailScreen />);
  }

  /** Taps "Kaldır" in the confirm dialog the last `appAlert` call opened. */
  const confirmDialog = () => {
    const buttons = (appAlert as jest.Mock).mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === 'Kaldır')!.onPress!();
  };
  const cancelDialog = () => {
    const buttons = (appAlert as jest.Mock).mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === 'İptal')!.onPress!();
  };

  beforeEach(() => {
    getMock.mockReset();
    removeItem.mockReset().mockResolvedValue({ data: {} });
    (captureException as jest.Mock).mockClear();
    mockParams = { id: 'col-1' };
    mockAuth = { isAuthenticated: true, user: { id: 'owner-1', membershipTier: 'free' } };
    successSpy = jest.spyOn(toast, 'success').mockImplementation(() => 'id');
    errorSpy = jest.spyOn(toast, 'error').mockImplementation(() => 'id');
  });
  afterEach(() => {
    successSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('the owner gets a labelled trash button on every item, listing and custom alike', async () => {
    renderWith([custom, listing]);
    const trashCustom = await screen.findByTestId('collection-item-remove-c1');
    const trashListing = screen.getByTestId('collection-item-remove-l1');
    expect(trashCustom.props.accessibilityRole).toBe('button');
    expect(trashCustom.props.accessibilityLabel).toBe('Koleksiyondan kaldır, Benim modelim');
    expect(trashListing.props.accessibilityLabel).toBe('Koleksiyondan kaldır, Satıştaki ilan');
  });

  it('a visitor sees no trash button', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'viewer-9', membershipTier: 'free' } };
    renderWith([custom, listing]);
    await screen.findByTestId('collection-item-c1');
    expect(screen.queryByTestId('collection-item-remove-c1')).toBeNull();
    expect(screen.queryByTestId('collection-item-remove-l1')).toBeNull();
    expect(screen.queryByLabelText(/Koleksiyondan kaldır/)).toBeNull();
  });

  it('a guest sees no trash button', async () => {
    mockAuth = { isAuthenticated: false, user: null };
    renderWith([custom]);
    await screen.findByTestId('collection-item-c1');
    expect(screen.queryByTestId('collection-item-remove-c1')).toBeNull();
  });

  it('asks first: nothing is removed until the destructive button is tapped; cancel removes nothing', async () => {
    renderWith([custom]);
    fireEvent.press(await screen.findByTestId('collection-item-remove-c1'));
    expect(appAlert).toHaveBeenCalledWith(
      'Ürünü kaldır',
      'Bu ürünü koleksiyondan kaldırmak istediğinizden emin misiniz?',
      expect.arrayContaining([expect.objectContaining({ text: 'Kaldır', style: 'destructive' })]),
      expect.anything(),
    );
    expect(removeItem).not.toHaveBeenCalled();

    cancelDialog();
    await act(async () => undefined);
    expect(removeItem).not.toHaveBeenCalled();
    expect(successSpy).not.toHaveBeenCalled();
  });

  it('confirm: DELETE the item, toast, and refresh the detail and "my collections" queries', async () => {
    const { queryClient } = renderWith([custom, listing]);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    fireEvent.press(await screen.findByTestId('collection-item-remove-c1'));
    confirmDialog();

    await waitFor(() => expect(removeItem).toHaveBeenCalledWith('col-1', 'c1'));
    await waitFor(() => expect(successSpy).toHaveBeenCalledWith('Ürün koleksiyondan kaldırıldı'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.collections.detail('col-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: qk.collections.mine });
  });

  it('the grid updates: the refreshed collection no longer has the item', async () => {
    renderWith([custom, listing]);
    fireEvent.press(await screen.findByTestId('collection-item-remove-c1'));
    getMock.mockImplementation(async (url: string) =>
      String(url).includes('favorites')
        ? { data: { data: [] } }
        : { data: { data: collectionFixture({ userId: 'owner-1', items: [listing] }) } },
    );
    confirmDialog();
    // Cheap condition first: a tree query on every poll would starve the mutation that is under test.
    await waitFor(() => expect(successSpy).toHaveBeenCalled());
    expect(await screen.findByTestId('collection-item-l1')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByTestId('collection-item-c1')).toBeNull());
  });

  it('the removal fails: an error toast, no success toast, the item stays', async () => {
    removeItem.mockRejectedValue({ isAxiosError: true, response: { status: 403, data: {} } });
    renderWith([custom]);
    fireEvent.press(await screen.findByTestId('collection-item-remove-c1'));
    confirmDialog();
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Ürün kaldırılamadı')));
    expect(successSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('collection-item-c1')).toBeOnTheScreen();
    // An expected 4xx is not a Sentry event; a server failure is.
    expect(captureException).not.toHaveBeenCalled();
  });

  it('a server failure while removing is reported to Sentry', async () => {
    removeItem.mockRejectedValue({ isAxiosError: true, response: { status: 500, data: {} } });
    renderWith([custom]);
    fireEvent.press(await screen.findByTestId('collection-item-remove-c1'));
    confirmDialog();
    await waitFor(() => expect(captureException).toHaveBeenCalledTimes(1));
  });
});

/** The first read of the collection: a refusal says why (web's texts), any other failure is an error with a retry. */
describe('collection detail: load states', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockParams = { id: 'col-1' };
    mockAuth = { isAuthenticated: true, user: { id: 'viewer-9', membershipTier: 'free' } };
  });

  it('a server failure shows the error state with a retry, not "Koleksiyon bulunamadı"', async () => {
    getMock.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: {} } });
    getMock.mockResolvedValue({ data: { data: collectionFixture() } });
    renderWithProviders(<CollectionDetailScreen />);
    expect(await screen.findByText('Bir şeyler ters gitti')).toBeOnTheScreen();
    expect(screen.queryByText('Koleksiyon bulunamadı')).toBeNull();

    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(await screen.findByText('Ferrari Koleksiyonum')).toBeOnTheScreen();
  });

  it('a network failure is an error too', async () => {
    getMock.mockRejectedValue(new Error('Network Error'));
    renderWithProviders(<CollectionDetailScreen />);
    expect(await screen.findByText('Bir şeyler ters gitti')).toBeOnTheScreen();
  });

  it('a 404 is "not found"', async () => {
    getMock.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: {} } });
    renderWithProviders(<CollectionDetailScreen />);
    expect(await screen.findByText('Koleksiyon bulunamadı')).toBeOnTheScreen();
    expect(screen.queryByText('Bir şeyler ters gitti')).toBeNull();
  });

  it('a 403 (another user\'s private collection) says it is private, with no retry that cannot succeed', async () => {
    getMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { statusCode: 403, message: 'Bu koleksiyon gizli', i18nKey: 'server.collection.isPrivate' } },
    });
    renderWithProviders(<CollectionDetailScreen />);
    expect(await screen.findByText('Bu koleksiyon özel')).toBeOnTheScreen();
    expect(screen.queryByText('Tekrar Dene')).toBeNull();
    expect(screen.queryByText('Koleksiyon bulunamadı')).toBeNull();
  });

  it('a 400 (a bad id in a link) is an invalid link', async () => {
    getMock.mockRejectedValue({ isAxiosError: true, response: { status: 400, data: {} } });
    renderWithProviders(<CollectionDetailScreen />);
    expect(await screen.findByText('Geçersiz koleksiyon bağlantısı')).toBeOnTheScreen();
    expect(screen.queryByText('Tekrar Dene')).toBeNull();
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
