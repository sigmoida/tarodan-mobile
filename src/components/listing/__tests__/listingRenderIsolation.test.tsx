/**
 * İlan formu performans kilidi:
 *  - Başlık/açıklama tuş vuruşu `useListingForm` controller'ını yeniden çalıştırmaz (alanlar
 *    `FormTextField` ile RHF'ye doğrudan bağlı; değer gönderimde `getValues()`).
 *  - Fiyat yazmak controller'ı çalıştırır (komisyon önizlemesi) ama ilgisiz memo'lu bölümler
 *    (seçenekler kartı) yeniden çizilmez.
 *  - Kota (`/products/my/stats`) açılışta TEK kez, `_t` önbellek kırıcısı olmadan sorulur.
 */
import { appAlert, toast } from '@/ui';
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
  api: { get: (...a: unknown[]) => mockGet(...a), post: jest.fn(), patch: jest.fn() },
  productsApi: {
    create: jest.fn(async () => ({ data: {} })),
    update: jest.fn(),
    getMyById: jest.fn(),
    delete: jest.fn(),
  },
  categoriesApi: { getAll: jest.fn(async () => ({ data: { data: [] } })) },
  addressesApi: {
    getAll: jest.fn(async () => ({
      data: [{ id: 'a1', isDefault: true, phone: '+905321234567', city: 'İstanbul', district: 'Kadıköy', address: 'Moda Cd. 1' }],
    })),
  },
  bankAccountApi: {
    get: jest.fn(async () => ({
      data: { id: 'x', accountHolder: 'Test User', iban: 'TR000000000000000000000001', isVerified: false },
    })),
  },
}));

const mockRefreshUserData = jest.fn(async () => null);
// Referans-kararlı durum (zustand gibi): her çağrıda yeni `limits` nesnesi memo'yu boşa düşürürdü.
const mockAuthState = {
  isAuthenticated: true,
  isLoading: false,
  user: { membershipTier: 'free', listingCount: 0 },
  limits: { maxListings: 10, maxImagesPerListing: 5, canTrade: false },
  refreshUserData: mockRefreshUserData,
};
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel?: (state: typeof mockAuthState) => unknown) =>
    sel ? sel(mockAuthState) : mockAuthState,
}));

let mockControllerRuns = 0;
jest.mock('../_hooks/useListingForm', () => {
  const actual = jest.requireActual('../_hooks/useListingForm');
  return {
    ...actual,
    useListingForm: (...args: unknown[]) => {
      mockControllerRuns += 1;
      return actual.useListingForm(...args);
    },
  };
});

// Seçenekler kartı (takas hakkı yok → yükseltme bağlantısı) her çizildiğinde sayılır.
let mockOptionsRenders = 0;
jest.mock('@/components/UpgradeCta', () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => {
    mockOptionsRenders += 1;
    return children;
  },
}));

import ListingForm from '../ListingForm';

const TITLE = "Örn: Hot Wheels '69 Camaro Z28";
const DESCRIPTION = 'Ürün hakkında detaylı bilgi';

describe('ilan formu — yazarken render yalıtımı', () => {
  let alertSpy: jest.Mock;
  let toastSpy: jest.SpyInstance;
  beforeEach(() => {
    mockGet.mockReset().mockImplementation((url: string) => {
      if (url === '/products/my/stats') {
        return Promise.resolve({
          data: {
            limits: { tierName: 'Free', tierType: 'free' },
            summary: { max: 10, used: 0, remaining: 10, canCreate: true },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    mockRefreshUserData.mockClear();
    alertSpy = (appAlert as jest.Mock).mockImplementation(() => undefined);
    toastSpy = jest.spyOn(toast, 'error').mockImplementation(() => 1);
  });
  afterEach(() => {
    alertSpy.mockRestore();
    toastSpy.mockRestore();
  });

  it('başlık/açıklama yazmak controller\'ı yeniden çalıştırmaz', async () => {
    renderWithProviders(<ListingForm mode="create" />);
    await screen.findByText('İlan Oluştur');
    await waitFor(() => expect(screen.queryByTestId('listing-limit-skeleton')).toBeNull());

    const runs = mockControllerRuns;
    fireEvent.changeText(screen.getByPlaceholderText(TITLE), 'H');
    fireEvent.changeText(screen.getByPlaceholderText(TITLE), 'Hot');
    fireEvent.changeText(screen.getByPlaceholderText(TITLE), 'Hot Wheels');
    fireEvent.changeText(screen.getByPlaceholderText(DESCRIPTION), 'Kutusunda');
    expect(mockControllerRuns).toBe(runs);
    expect(screen.getByDisplayValue('Hot Wheels')).toBeOnTheScreen();
    // Sayaç alanla birlikte güncellenir.
    expect(screen.getByText('10/200')).toBeOnTheScreen();

    // Gönderim değerleri formdan okur: kısa başlık kuralı hâlâ çalışır.
    fireEvent.changeText(screen.getByPlaceholderText(TITLE), 'Abc');
    fireEvent.press(screen.getByText('İlan Oluştur'));
    expect(toastSpy).toHaveBeenCalledWith('En az 5 karakter olmalıdır');
  });

  it('fiyat yazmak ilgisiz memo\'lu bölümleri yeniden çizmez', async () => {
    renderWithProviders(<ListingForm mode="create" />);
    await screen.findByText('İlan Oluştur');
    await waitFor(() => expect(screen.queryByTestId('listing-limit-skeleton')).toBeNull());

    const runs = mockControllerRuns;
    const options = mockOptionsRenders;
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '1');
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '15');
    expect(mockControllerRuns).toBeGreaterThan(runs);
    expect(mockOptionsRenders).toBe(options);
  });

  it('kota açılışta tek kez ve önbellek kırıcısız sorulur', async () => {
    renderWithProviders(<ListingForm mode="create" />);
    await screen.findByText('İlan Oluştur');
    await waitFor(() => expect(screen.queryByTestId('listing-limit-skeleton')).toBeNull());
    // Kullanıcı tazelemesinin bitmesini de bekle (eskiden ardından kota ikinci kez çekiliyordu).
    await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));

    const statsCalls = mockGet.mock.calls.filter(([url]) => url === '/products/my/stats');
    expect(statsCalls).toHaveLength(1);
    expect(statsCalls[0]).toEqual(['/products/my/stats']);
  });
});
