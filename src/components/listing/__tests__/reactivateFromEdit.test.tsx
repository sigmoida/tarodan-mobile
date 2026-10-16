/**
 * Parite C-1.6 · düzenleme formundan (satılmış ilan) yeniden aktivasyon.
 * Mesaj ve yerel statü API yanıtındaki GERÇEK statüye göre seçilir: iade
 * karantinasındaki ilan doğrudan `active`, diğerleri `pending` (inceleme).
 */
import React from 'react';
import { appAlert, toast } from '@/ui';
import { screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({}),
}));

const mockGet = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: (...a: any[]) => mockGet(...a), post: jest.fn(), patch: jest.fn() },
  productsApi: {
    create: jest.fn(),
    update: jest.fn(),
    getMyListings: jest.fn(),
    getMyStats: jest.fn(),
    getMyById: jest.fn(),
    delete: jest.fn(),
  },
  categoriesApi: { getAll: jest.fn(async () => ({ data: { data: [] } })) },
  shippingApi: { getPackageTiers: jest.fn(async () => ({ data: { tariffVersion: 1, tiers: [] } })) },
  bankAccountApi: {
    get: jest.fn(async () => ({
      data: { id: 'x', accountHolder: 'T', iban: 'TR000000000000000000000001', isVerified: false },
    })),
  },
}));
import { productsApi } from '@/lib/api';

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      isAuthenticated: true,
      isLoading: false,
      user: { membershipTier: 'free', listingCount: 0 },
      limits: { maxListings: 10, maxImagesPerListing: 5, canTrade: false },
      refreshUserData: jest.fn(async () => {}),
    };
    return sel ? sel(state) : state;
  },
}));

import ListingForm from '../ListingForm';

const SOLD_PROJECTION = {
  quantity: 0,
  availableQuantity: 0,
  isPreorder: false,
  edit: {
    title: 'Satılmış ilan',
    description: '',
    price: 500,
    oldPrice: null,
    salePrice: null,
    saleStartDate: null,
    saleEndDate: null,
    categoryId: 'c1',
    brandId: null,
    carModelId: null,
    manufacturerId: null,
    condition: 'very_good',
    status: 'sold',
    modelCode: '',
    color: null,
    isBoxed: null,
    quantity: 0,
    maxQuantityPerOrder: null,
    shippingPackageTier: 'small',
    isTradeEnabled: false,
    isSet: false,
    bundleSize: null,
    isLimited: false,
    editionNumber: null,
    editionTotal: null,
    releaseDate: null,
    year: null,
    images: [],
    attributes: [],
  },
};

jest.setTimeout(20000);

describe('düzenleme formu · yeniden aktivasyon mesajı yanıt statüsüne göre', () => {
  let alertSpy: jest.Mock;
  let toastSuccess: jest.SpyInstance;

  afterEach(() => toastSuccess.mockRestore());

  beforeEach(() => {
    toastSuccess = jest.spyOn(toast, 'success').mockImplementation(() => 1);
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: {} });
    alertSpy = (appAlert as jest.Mock).mockImplementation(() => {});
    alertSpy.mockClear();
    (productsApi.getMyById as jest.Mock).mockReset();
    (productsApi.getMyById as jest.Mock).mockResolvedValue({ data: { data: SOLD_PROJECTION } });
    (productsApi.update as jest.Mock).mockReset();
  });

  async function reactivate() {
    renderWithProviders(<ListingForm mode="edit" productId="p1" />);
    fireEvent.changeText(await screen.findByPlaceholderText('Stok Miktarı'), '3');
    fireEvent.press(screen.getByText('Onaya Gönder'));
  }

  it('API active döndürürse "tekrar yayında" gösterir', async () => {
    (productsApi.update as jest.Mock).mockResolvedValue({ data: { id: 'p1', status: 'active' } });
    await reactivate();
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('İlanınız tekrar yayında! Onay beklemeden satışa açıldı.'),
    );
    expect(alertSpy).not.toHaveBeenCalled();
    expect(productsApi.update).toHaveBeenCalledWith('p1', { status: 'active', quantity: 3 });
  });

  it('düzenlemede alt çubuk (klavyeyle yükselir): üstte Kaydet, altında yan yana İlanı Sil + İptal; gövdede sil yok', async () => {
    renderWithProviders(<ListingForm mode="edit" productId="p1" />);
    await screen.findByPlaceholderText('Stok Miktarı');
    const footer = screen.getByTestId('page-shell-footer');
    expect(within(footer).getByTestId('listing-submit-button')).toBeTruthy();
    expect(within(footer).getByTestId('listing-delete-button')).toBeTruthy();
    expect(within(footer).getByText('İptal')).toBeTruthy();
    expect(screen.getAllByText('İlanı Sil')).toHaveLength(1);
  });

  it('API pending döndürürse "incelemeye gönderildi" gösterir', async () => {
    (productsApi.update as jest.Mock).mockResolvedValue({ data: { id: 'p1', status: 'pending' } });
    await reactivate();
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('İlan incelemeye gönderildi. Onaylandığında yeniden yayına girer.'),
    );
  });
});
