/**
 * J30 · Koleksiyon düzenle formu — mobil UI dilimi.
 * Form mevcut değerlerle dolar (reset), validasyon (ad min 3), kaydet wiring (PATCH),
 * sahiplik: yabancıda "düzenleme yetkiniz yok" ekranı.
 * Backend: güncelleme/silme kalıcılığı, kapak multipart, item kaldırma backend-only.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { appAlert, toast } from '@/ui';

let mockParams: Record<string, string> = { id: 'col-1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));

// The collections API calls land on three mocks keyed by the URL they stand for, so the tests keep
// asserting `GET|PATCH|DELETE /collections/:id`.
const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();
jest.mock('@/lib/api', () => ({
  collectionsApi: {
    getOne: (id: string) => mockGet(`/collections/${id}`),
    update: (id: string, data: unknown) => mockPatch(`/collections/${id}`, data),
    delete: (id: string) => mockDelete(`/collections/${id}`),
    removeItem: jest.fn(),
  },
}));

let mockAuth: Record<string, unknown> = { user: { id: 'owner-1' } };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuth;
    return sel ? sel(state) : state;
  },
}));

import EditCollectionScreen from '../edit';

const getMock = mockGet;
const patchMock = mockPatch;

function collectionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'col-1',
    name: 'Vintage Arabalar',
    slug: 'vintage',
    description: 'Eski güzel günler',
    coverImageUrl: null,
    isPublic: true,
    viewCount: 10,
    likeCount: 3,
    userId: 'owner-1',
    items: [],
    createdAt: new Date('2026-01-01').toISOString(),
    ...overrides,
  };
}

describe('J30 · Koleksiyon düzenle formu (mobil)', () => {
  beforeEach(() => {
    getMock.mockReset();
    patchMock.mockReset();
    mockParams = { id: 'col-1' };
    mockAuth = { user: { id: 'owner-1' } };
  });

  it('J30.5 form mevcut koleksiyon değerleriyle dolar', async () => {
    getMock.mockResolvedValue({ data: collectionFixture() });
    renderWithProviders(<EditCollectionScreen />);
    await waitFor(() =>
      expect(screen.getByDisplayValue('Vintage Arabalar')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Değişiklikleri Kaydet')).toBeOnTheScreen();
  });

  it('J30.6 adı geçersiz (kısa) yapınca validasyon hatası, PATCH çağrılmaz', async () => {
    getMock.mockResolvedValue({ data: collectionFixture() });
    renderWithProviders(<EditCollectionScreen />);
    await waitFor(() =>
      expect(screen.getByDisplayValue('Vintage Arabalar')).toBeOnTheScreen(),
    );
    fireEvent.changeText(screen.getByDisplayValue('Vintage Arabalar'), 'ab');
    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));
    await waitFor(() =>
      expect(screen.getByText('Koleksiyon adı en az 3 karakter olmalı')).toBeOnTheScreen(),
    );
    expect(patchMock).not.toHaveBeenCalled();
  });

  it('J30.7 geçerli değişiklik → PATCH /collections/:id çağrılır', async () => {
    getMock.mockResolvedValue({ data: collectionFixture() });
    patchMock.mockResolvedValue({});
    renderWithProviders(<EditCollectionScreen />);
    await waitFor(() =>
      expect(screen.getByDisplayValue('Vintage Arabalar')).toBeOnTheScreen(),
    );
    fireEvent.changeText(screen.getByDisplayValue('Vintage Arabalar'), 'Vintage Klasikler');
    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));
    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith(
        '/collections/col-1',
        expect.objectContaining({ name: 'Vintage Klasikler' }),
      ),
    );
  });

  it('J106.3 yabancı kullanıcıda düzenleme yetkisi yok ekranı', async () => {
    mockAuth = { user: { id: 'stranger-9' } };
    getMock.mockResolvedValue({ data: collectionFixture({ userId: 'owner-1' }) });
    renderWithProviders(<EditCollectionScreen />);
    expect(
      await screen.findByText('Bu koleksiyonu düzenleme yetkiniz yok'),
    ).toBeOnTheScreen();
  });

  it('silme sabit alt barda (Kaydet altında); "Tehlikeli Bölge" kartı yok; onay diyaloğu korunur', async () => {
    (appAlert as jest.Mock).mockClear?.();
    getMock.mockResolvedValue({ data: collectionFixture() });
    renderWithProviders(<EditCollectionScreen />);
    const del = await screen.findByTestId('collection-delete-button');
    expect(screen.getByTestId('collection-save-button')).toBeOnTheScreen();
    expect(screen.queryByText('Tehlikeli Bölge')).toBeNull();
    fireEvent.press(del);
    expect(appAlert).toHaveBeenCalledWith(
      'Koleksiyonu Sil',
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ style: 'destructive' })]),
    );
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

/** A custom item has no listing: its row is not a link (it used to open `/product/undefined`). */
describe('collection edit: item rows', () => {
  const push = jest.requireMock('expo-router').router.push as jest.Mock;

  beforeEach(() => {
    getMock.mockReset();
    push.mockClear();
    mockParams = { id: 'col-1' };
    mockAuth = { user: { id: 'owner-1' } };
  });

  it('a listing row opens its listing; a custom item row is not a button and does nothing', async () => {
    const items = [
      { id: 'l1', productId: 'p1', productTitle: 'Listing row', isCustom: false, isFeatured: false, sortOrder: 1 },
      { id: 'c1', productTitle: 'Custom row', isCustom: true, isFeatured: false, sortOrder: 2 },
    ];
    getMock.mockResolvedValue({ data: { data: collectionFixture({ items }) } });
    renderWithProviders(<EditCollectionScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Listing row' }));
    expect(push).toHaveBeenCalledWith('/product/p1');
    push.mockClear();
    expect(screen.queryByRole('button', { name: 'Custom row' })).toBeNull();
    fireEvent.press(screen.getByText('Custom row'));
    expect(push).not.toHaveBeenCalled();
  });

  it('lists the same visible items as the detail screen: a hidden listing is neither shown nor counted', async () => {
    const items = [
      { id: 'l1', productId: 'p1', productTitle: 'Listing row', productStatus: 'active', isCustom: false, isFeatured: false, sortOrder: 2 },
      { id: 'h1', productId: 'p2', productTitle: 'Hidden row', productStatus: 'pending', isCustom: false, isFeatured: false, sortOrder: 1 },
      { id: 'c1', productTitle: 'Custom row', customTitle: 'Custom title', isCustom: true, isFeatured: false, sortOrder: 0 },
    ];
    getMock.mockResolvedValue({ data: { data: collectionFixture({ items }) } });
    renderWithProviders(<EditCollectionScreen />);
    expect(await screen.findByText('Custom title')).toBeOnTheScreen();
    expect(screen.getByText('Listing row')).toBeOnTheScreen();
    expect(screen.queryByText('Hidden row')).toBeNull();
    expect(screen.getByText('Koleksiyondaki Ürünler (2)')).toBeOnTheScreen();
  });

  it('the x button asks first, then removes the item through the shared removal (DELETE, toast)', async () => {
    const removeItem = jest.requireMock('@/lib/api').collectionsApi.removeItem as jest.Mock;
    removeItem.mockReset().mockResolvedValue({ data: {} });
    const successSpy = jest.spyOn(toast, 'success').mockImplementation(() => 'id');
    const items = [{ id: 'c1', productTitle: 'Custom row', isCustom: true, isFeatured: false, sortOrder: 1 }];
    getMock.mockResolvedValue({ data: { data: collectionFixture({ items }) } });
    renderWithProviders(<EditCollectionScreen />);

    fireEvent.press(await screen.findByLabelText('Koleksiyondan kaldır, Custom row'));
    expect(removeItem).not.toHaveBeenCalled();
    const buttons = (appAlert as jest.Mock).mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === 'Kaldır')!.onPress!();

    await waitFor(() => expect(removeItem).toHaveBeenCalledWith('col-1', 'c1'));
    await waitFor(() => expect(successSpy).toHaveBeenCalledWith('Ürün koleksiyondan kaldırıldı'));
    successSpy.mockRestore();
  });
});
