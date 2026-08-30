/**
 * Düzenleme prefill sözleşmesi — satıcının DOKUNMADIĞI alan sessizce değişmez.
 *
 * İki regresyon burada kilitleniyor:
 *
 * 1. `attributes[]` payload'ı YALNIZ üretici-kapsamlı nitelikleri taşır.
 *    Üretici-bağımsız gruplar (`scale`, `material`) formda kendi alanlarına
 *    sahip ve arayüzde HİÇ render edilmiyor; payload'a girerlerse satıcının
 *    ölçek çipiyle bilerek yaptığı değişikliği sunucu eski nitelikle geri yazar.
 *
 * 2. Etiket yedeği (marka/model adları) YALNIZ ilgili liste henüz
 *    yüklenmemişken devrededir. Liste geldiğinde `.find()` tek otoritedir;
 *    aksi halde marka değişince picker eski markanın modelini göstermeye
 *    devam eder ve bayat `carModelId` maskelenir.
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

/** 2026-08-10 staging ölçümü: `scale`/`material` üretici-BAĞIMSIZ, `series` kapsamlı. */
const EDIT_RESPONSE = {
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
    carModelId: 'model-eski',
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
    isLimited: false,
    editionNumber: null,
    editionTotal: null,
    releaseDate: null,
    year: null,
    images: [
      {
        cardKey: 'card-1',
        detailKey: 'detail-1',
        cardUrl: 'https://example.com/card-1.jpg',
        detailUrl: 'https://example.com/detail-1.jpg',
        sortOrder: 0,
      },
    ],
    attributes: [
      { groupSlug: 'scale', groupName: 'Ölçek', slug: '1-64', value: '1:64', displayValue: '1:64', manufacturerSlug: null },
      { groupSlug: 'material', groupName: 'Malzeme', slug: 'diecast', value: 'diecast', displayValue: 'Diecast Metal', manufacturerSlug: null },
      { groupSlug: 'series', groupName: 'Seri', slug: 'premium', value: 'Premium', displayValue: 'Premium', manufacturerSlug: 'hot-wheels' },
    ],
    categoryName: 'Araba',
    brandName: 'Mini GT',
    carModelName: 'ID. Buzz',
    manufacturerName: 'Hot Wheels',
  },
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

beforeEach(() => {
  mockGet.mockReset();
  (productsApi.update as jest.Mock).mockClear();
  (productsApi.getMyById as jest.Mock).mockReset();
  (productsApi.getMyById as jest.Mock).mockResolvedValue({ data: { data: EDIT_RESPONSE } });
  (appAlert as jest.Mock).mockImplementation(() => {});
});

describe('düzenleme payload — attributes[] yalnız üretici-kapsamlı', () => {
  it('scale/material niteliklerini attributes[] dizisine SIZDIRMAZ', async () => {
    wireApi();
    renderWithProviders(<ListingForm mode="edit" productId="p1" />);
    await screen.findByText('Değişiklikleri Kaydet');

    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));

    await waitFor(() => expect(productsApi.update).toHaveBeenCalled());
    const payload = (productsApi.update as jest.Mock).mock.calls[0][1];

    // Kapsamlı grup girer…
    expect(payload.attributes).toEqual(['premium']);
    // …bağımsız gruplar GİRMEZ (aksi halde ölçek/malzeme çipi geri yazılır).
    expect(payload.attributes).not.toContain('1-64');
    expect(payload.attributes).not.toContain('diecast');
  });

  it('ölçek ve malzeme kendi alanlarından formun sözlüğüyle aynı formatta gider', async () => {
    wireApi();
    renderWithProviders(<ListingForm mode="edit" productId="p1" />);
    await screen.findByText('Değişiklikleri Kaydet');

    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));

    await waitFor(() => expect(productsApi.update).toHaveBeenCalled());
    const payload = (productsApi.update as jest.Mock).mock.calls[0][1];
    expect(payload.scale).toBe('1:64');
    expect(payload.material).toBe('diecast');
  });

  it('satıcının seçtiği ölçek çipi payload`a AYNEN gider', async () => {
    wireApi();
    renderWithProviders(<ListingForm mode="edit" productId="p1" />);
    await screen.findByText('Değişiklikleri Kaydet');

    fireEvent.press(screen.getByText('1:18'));
    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));

    await waitFor(() => expect(productsApi.update).toHaveBeenCalled());
    const payload = (productsApi.update as jest.Mock).mock.calls[0][1];
    expect(payload.scale).toBe('1:18');
    expect(payload.attributes).toEqual(['premium']);
  });
});

describe('409 — form TAMAMEN sunucunun taze haline döner', () => {
  it('nitelik seçimi de geri alınır — "en güncel hali yüklendi" mesajı doğruyu söyler', async () => {
    wireApi();
    (productsApi.update as jest.Mock).mockRejectedValue({ response: { status: 409 } });

    renderWithProviders(<ListingForm mode="edit" productId="p1" />);
    await screen.findByText('Değişiklikleri Kaydet');

    // Sunucudaki seçim: Premium. Satıcı Mainline yapıyor.
    fireEvent.press(await screen.findByText('Premium'));
    fireEvent.press(await screen.findByText('Mainline'));
    await waitFor(() => expect(screen.getByText('Mainline')).toBeOnTheScreen());

    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));

    // 409 sonrası nitelik seçimi sunucunun tazesine döner; eski oturumdan
    // kalan 'mainline' bir sonraki kaydetmede payload'a KARIŞMAZ.
    await waitFor(() => expect(screen.getByText('Premium')).toBeOnTheScreen());
    expect(screen.queryByText('Mainline')).toBeNull();
  });

  /**
   * `applyMappedListing` 409 dalında da çağrıldığı için `initialCustomAttrsRef`
   * orada da kuruluyordu — ama onu tüketen TEK yer üretici-grup efekti ve o
   * efekt 409'dan sonra tetiklenmiyor (üretici değişmedi). Ref asılı kalınca
   * bir SONRAKİ üretici değişimi onu görüp eski üreticinin niteliklerini geri
   * yazıyordu: arayüzde hiç görünmeyen, payload'a giren bir seçim.
   */
  it('409 sonrası üretici değişiminde ESKİ üreticinin nitelikleri payload`a girmez', async () => {
    wireApi();
    (productsApi.update as jest.Mock).mockRejectedValue({ response: { status: 409 } });

    renderWithProviders(<ListingForm mode="edit" productId="p1" />);
    await screen.findByText('Değişiklikleri Kaydet');
    // man-1'in grupları yüklendi ve sunucudaki seçim uygulandı.
    await screen.findByText('Premium');

    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));
    await waitFor(() => expect(productsApi.update).toHaveBeenCalledTimes(1));

    // Satıcı üreticiyi değiştiriyor → man-2'nin grupları geliyor (`series` YOK).
    fireEvent.press(screen.getByText('Hot Wheels'));
    fireEvent.press(await screen.findByText('Tomica'));
    await waitFor(() => expect(screen.getByText('Edisyon seçin')).toBeOnTheScreen());

    (productsApi.update as jest.Mock).mockResolvedValue({ data: {} });
    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));

    await waitFor(() => expect(productsApi.update).toHaveBeenCalledTimes(2));
    const payload = (productsApi.update as jest.Mock).mock.calls[1][1];
    expect(payload.attributes).toBeUndefined();
    expect(payload.attributes ?? []).not.toContain('premium');
  });
});

describe('etiket yedeği — liste yüklenince `.find()` kazanır', () => {
  it('liste boşken yedek etiket devrededir', async () => {
    // Marka listesi hiç gelmiyor → picker eşleyicinin taşıdığı adı gösterir.
    wireApi({ brands: [] });
    renderWithProviders(<ListingForm mode="edit" productId="p1" />);

    expect(await screen.findByText('Mini GT')).toBeOnTheScreen();
  });

  it('model listesi yüklendiğinde uyumsuz carModelId MASKELENMEZ', async () => {
    // Liste dolu ama kayıttaki `model-eski` içinde YOK → satıcı uyumsuzluğu
    // görmeli; eski davranış "ID. Buzz" göstermeye devam ediyordu.
    wireApi({ models: [{ id: 'model-yeni', name: 'Tomica Skyline', slug: 'skyline' }] });
    renderWithProviders(<ListingForm mode="edit" productId="p1" />);

    await screen.findByText('Değişiklikleri Kaydet');
    await waitFor(() => expect(screen.getByText('Model Seçin')).toBeOnTheScreen());
    expect(screen.queryByText('ID. Buzz')).toBeNull();
  });
});
