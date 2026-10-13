/**
 * "Koleksiyona ekle" sheet'inden gelen `addProductId` route param'ı: koleksiyon oluşturulunca
 * ürün de eklenir, kullanıcı ürün sayfasına döner (toast); ekleme başarısızsa koleksiyon
 * sayfasına gidilir. Param yokken eski akış (1.5 sn sonra koleksiyon sayfası) değişmez.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { backMock, canGoBackMock, replaceMock, resetRouterMocks } from '@/test-utils/router-mock';

let mockParams: Record<string, string> = { addProductId: 'p9' };
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn(), patch: jest.fn() },
  collectionsApi: { addItem: jest.fn() },
}));
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) => {
    const state = { isAuthenticated: true, user: { id: 'u1' }, limits: { canCreateCollections: true } };
    return sel ? sel(state) : state;
  },
}));

import { api, collectionsApi } from '@/lib/api';
import { toast } from '@/ui';
import NewCollectionScreen from '../index';

const post = api.post as jest.Mock;
const addItem = collectionsApi.addItem as jest.Mock;

function submit() {
  renderWithProviders(<NewCollectionScreen />);
  fireEvent.changeText(screen.getByPlaceholderText('örn: Ferrari 1:18 Koleksiyonum'), 'Ferrari Koleksiyonum');
  fireEvent.press(screen.getByText('Koleksiyon Oluştur'));
}

beforeEach(() => {
  resetRouterMocks();
  post.mockReset().mockResolvedValue({ data: { id: 'col-1' } });
  addItem.mockReset().mockResolvedValue({ data: {} });
  (toast.success as jest.Mock).mockClear();
  (toast.error as jest.Mock).mockClear();
  mockParams = { addProductId: 'p9' };
});

describe('collections/new · addProductId', () => {
  it('oluşturur, ürünü ekler, ürün sayfasına geri döner (toast)', async () => {
    canGoBackMock.mockReturnValue(true);
    submit();
    await waitFor(() => expect(addItem).toHaveBeenCalledWith('col-1', { productId: 'p9' }));
    await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith('"Ferrari Koleksiyonum" koleksiyonuna eklendi');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('geri gidecek yer yoksa ürün sayfasına replace', async () => {
    canGoBackMock.mockReturnValue(false);
    submit();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/product/p9'));
  });

  it('ekleme başarısız: hata toast, koleksiyon sayfasına gider (koleksiyon oluştu)', async () => {
    addItem.mockRejectedValue(new Error('x'));
    submit();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/collections/col-1'));
    expect(toast.error).toHaveBeenCalledWith('Ürün koleksiyona eklenemedi.');
    expect(backMock).not.toHaveBeenCalled();
  });

  it('param yokken ürün eklenmez (eski akış)', async () => {
    mockParams = {};
    submit();
    await waitFor(() => expect(post).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Koleksiyon oluşturuldu!'));
    expect(addItem).not.toHaveBeenCalled();
  });
});
