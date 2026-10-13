/**
 * Düzenleme + gizli nitelik grupları (C3 inceleme 3).
 *
 * `HIDDEN_GROUP_SLUGS` (`vehicle_type`) gruplarını form hiç sunmaz; web de
 * (`customAttributesOf`) onları `attributes[]`'a KOYMAZ. Sunucu `PATCH`
 * sıfırlamasında bu gruplara dokunmaz (`NON_CUSTOM_GROUP_SLUGS` = sabit üçlü +
 * gizli; `product-update.service`), yani `attributes: []` ilanın gizli
 * bağlantılarını SİLMEZ. Burada: gizli slug payload'a girmez; görünür seçim
 * yokken `[]` gider (kullanıcının temizlediği seçim sunucuda kalmasın).
 */
import React from 'react';
import { appAlert } from '@/ui';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: false })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockGet = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: (...a: any[]) => mockGet(...a), post: jest.fn(), patch: jest.fn() },
  productsApi: {
    create: jest.fn(async () => ({ data: {} })),
    update: jest.fn(async () => ({ data: {} })),
    getMyListings: jest.fn(),
    getMyStats: jest.fn(),
    getMyById: jest.fn(),
    delete: jest.fn(),
  },
  categoriesApi: { getAll: jest.fn(async () => ({ data: { data: [] } })) },
  addressesApi: {
    getAll: jest.fn(async () => ({ data: [] })),
  },
  shippingApi: { getPackageTiers: () => mockGet('/shipping/package-tiers') },
  bankAccountApi: { get: jest.fn(async () => ({ data: null })) },
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

const TARIFF = {
  tariffVersion: 3,
  tiers: [
    { code: 'small', label: 'Küçük Paket', amount: 100, billableDesi: 2, minDesi: 0, maxDesi: 2, sampleWidth: null, sampleHeight: null, sampleLength: null },
  ],
};

const BRANDS = [{ id: 'brand-1', name: 'Mini GT', slug: 'mini-gt' }];
const MANUFACTURERS = [
  { id: 'man-1', name: 'Hot Wheels', slug: 'hot-wheels' },
  { id: 'man-2', name: 'Tomica', slug: 'tomica' },
];

const ATTR_GROUPS: Record<string, Array<Record<string, unknown>>> = {
  'hot-wheels': [
    {
      slug: 'series',
      name: 'Seri',
      manufacturerSlug: 'hot-wheels',
      isRequired: false,
      attributes: [
        { slug: 'premium', label: 'Premium' },
        { slug: 'mainline', label: 'Mainline' },
      ],
    },
  ],
  // Farklı groupSlug: `series` seçimi burada arayüzde HİÇ render edilmez.
  tomica: [
    {
      slug: 'edition',
      name: 'Edisyon',
      manufacturerSlug: 'tomica',
      isRequired: false,
      attributes: [{ slug: 'limited', label: 'Limited' }],
    },
  ],
};

function wireApi(opts: { brands?: typeof BRANDS; models?: Array<{ id: string; name: string; slug: string }> } = {}) {
  mockGet.mockImplementation((url: string, args?: { params?: Record<string, unknown> }) => {
    if (url === '/products/filters') {
      return Promise.resolve({
        data: {
          scales: [],
          materials: [],
          brands: opts.brands ?? BRANDS,
          manufacturers: MANUFACTURERS,
        },
      });
    }
    if (url === '/car-models') {
      return Promise.resolve({ data: opts.models ?? [] });
    }
    if (url === '/products/attribute-groups') {
      const slug = args?.params?.manufacturer as string;
      return Promise.resolve({ data: ATTR_GROUPS[slug] ?? [] });
    }
    if (url === '/shipping/package-tiers') return Promise.resolve({ data: TARIFF });
    if (url === '/orders/commission-preview') {
      return Promise.resolve({ data: { sellerFeeAmount: 10, sellerNetAmount: 90 } });
    }
    return Promise.resolve({ data: {} });
  });
}


const EDIT_BASE = {
  quantity: 1,
  availableQuantity: 1,
  isPreorder: false,
  edit: {
    title: 'Mini GT Volkswagen',
    description: '',
    price: 500,
    oldPrice: null,
    salePrice: null,
    saleStartDate: null,
    saleEndDate: null,
    categoryId: 'c1',
    brandId: 'brand-1',
    carModelId: null,
    manufacturerId: 'man-1',
    condition: 'very_good',
    status: 'active',
    modelCode: '',
    color: null,
    isBoxed: null,
    quantity: 1,
    maxQuantityPerOrder: null,
    shippingPackageTier: 'small',
    isTradeEnabled: false,
    isSet: false,
    bundleSize: null,
    year: null,
    images: [1, 2, 3].map((n) => ({
      cardKey: `card-${n}`,
      detailKey: `detail-${n}`,
      cardUrl: `https://example.com/card-${n}.jpg`,
      detailUrl: `https://example.com/detail-${n}.jpg`,
      sortOrder: n - 1,
    })),
    attributes: [] as Array<Record<string, unknown>>,
    categoryName: 'Araba',
    brandName: 'Mini GT',
    carModelName: '',
    manufacturerName: 'Hot Wheels',
  },
};

const HIDDEN_GLOBAL = { groupSlug: 'vehicle_type', groupName: 'Araç tipi', slug: 'suv', value: 'SUV', displayValue: 'SUV', manufacturerSlug: null };
const HIDDEN_SCOPED = { groupSlug: 'vehicle_type', groupName: 'Araç tipi', slug: 'sedan', value: 'Sedan', displayValue: 'Sedan', manufacturerSlug: 'hot-wheels' };
const VISIBLE = { groupSlug: 'series', groupName: 'Seri', slug: 'premium', value: 'Premium', displayValue: 'Premium', manufacturerSlug: 'hot-wheels' };

function respondWith(attributes: Array<Record<string, unknown>>) {
  (productsApi.getMyById as jest.Mock).mockResolvedValue({
    data: { data: { ...EDIT_BASE, edit: { ...EDIT_BASE.edit, attributes } } },
  });
}

async function save() {
  renderWithProviders(<ListingForm mode="edit" productId="p1" />);
  await screen.findByText('Değişiklikleri Kaydet');
  // Görünür grup yüklendi (seçim prefill edildi) — tekrar tıklanabilir sürede.
  fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));
  await waitFor(() => expect(productsApi.update).toHaveBeenCalled());
  return (productsApi.update as jest.Mock).mock.calls[0][1];
}

beforeEach(() => {
  mockGet.mockReset();
  (productsApi.update as jest.Mock).mockClear();
  (productsApi.getMyById as jest.Mock).mockReset();
  (appAlert as jest.Mock).mockImplementation(() => {});
  wireApi();
});

describe('düzenleme payload — gizli gruplar', () => {
  it('görünür seçim + gizli bağlar: yalnız görünür slug gider, gizli slug payload a girmez', async () => {
    respondWith([VISIBLE, HIDDEN_GLOBAL, HIDDEN_SCOPED]);
    const payload = await save();

    expect(payload.attributes).toEqual(['premium']);
    expect(payload.attributes).not.toContain('suv');
    expect(payload.attributes).not.toContain('sedan');
  });

  it('görünür seçim yokken [] gider (temizlenen seçim sunucuda kalmaz); gizli slug yine girmez', async () => {
    respondWith([HIDDEN_GLOBAL, HIDDEN_SCOPED]);
    const payload = await save();

    expect(payload.attributes).toEqual([]);
  });

  it('hiç nitelik yokken de [] gider (düzenlemede alan atlanmaz)', async () => {
    respondWith([]);
    const payload = await save();

    expect(payload.attributes).toEqual([]);
  });
});
