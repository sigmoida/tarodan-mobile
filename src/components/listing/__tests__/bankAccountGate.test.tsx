/**
 * IBAN kapısı (web `BankGate`): yeni ilan formu banka hesabı olana kadar GÖSTERİLMEZ.
 * Bilinmeyen durum (yükleniyor/hata) "IBAN ekle" demez: loader / ErrorState + yeniden dene.
 * Hook davranışı `renderHook` ile sürülür; görünüm: `listingRequirementGate.test.tsx`.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { router } from 'expo-router';
import { makeTestQueryClient } from '../../../test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockGetBank = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(async () => ({ data: {} })), post: jest.fn(), patch: jest.fn() },
  productsApi: { create: jest.fn(), update: jest.fn(), getMyListings: jest.fn(), getMyStats: jest.fn(), getMyById: jest.fn(), delete: jest.fn() },
  categoriesApi: { getAll: jest.fn(async () => ({ data: { data: [] } })) },
  addressesApi: {
    getAll: jest.fn(async () => ({
      data: [{ id: 'a1', isDefault: true, phone: '+905321234567', city: 'İstanbul', district: 'Kadıköy', address: 'Moda Cd. 1' }],
    })),
  },
  shippingApi: { getPackageTiers: jest.fn(async () => ({ data: { tariffVersion: 1, tiers: [] } })) },
  bankAccountApi: { get: () => mockGetBank() },
}));

const mockAuthUser = { membershipTier: 'free', listingCount: 0 };
const mockAuthLimits = { maxListings: 10, maxImagesPerListing: 5, canTrade: false };
const mockRefreshUserData = jest.fn(async () => {});
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      isAuthenticated: true,
      isLoading: false,
      user: mockAuthUser,
      limits: mockAuthLimits,
      refreshUserData: mockRefreshUserData,
    };
    return sel ? sel(state) : state;
  },
}));

// Doğrulamayı geçir: gönderimdeki IBAN kapısına ulaşılsın (asıl denenen o).
jest.mock('../_lib/validate', () => ({
  ...jest.requireActual('../_lib/validate'),
  firstListingValidationError: () => null,
}));

import { productsApi } from '@/lib/api';
import { useListingForm } from '../_hooks/useListingForm';

const ACCOUNT = { id: 'x', accountHolder: 'T', iban: 'TR000000000000000000000001', isVerified: false };

function renderForm(mode: 'create' | 'edit' = 'create') {
  const queryClient = makeTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useListingForm({ mode, productId: mode === 'edit' ? 'p1' : undefined } as any), {
    wrapper: Wrapper,
  });
}

beforeEach(() => {
  mockGetBank.mockReset();
  (router.push as jest.Mock).mockClear();
  (appAlert as jest.Mock).mockClear?.();
});

describe('useListingForm: IBAN durumu', () => {
  it('yüklenirken yükleniyor açık, hata kapalı, hesap yok (gönderim ayrı testte engellenir)', async () => {
    mockGetBank.mockReturnValue(new Promise(() => {}));
    const { result } = renderForm();
    await waitFor(() => expect(result.current.bankAccountLoading).toBe(true));
    expect(result.current.bankAccountError).toBe(false);
    expect(result.current.hasBankAccount).toBe(false);
  });

  it('okuma hatasında eksik sayılmaz; yeniden denince hesap gelir ve kapı açılır', async () => {
    mockGetBank.mockRejectedValue(new Error('network'));
    const { result } = renderForm();
    await waitFor(() => expect(result.current.bankAccountError).toBe(true), { timeout: 5000 });
    expect(result.current.bankAccountLoading).toBe(false);
    expect(result.current.hasBankAccount).toBe(false);

    mockGetBank.mockResolvedValue({ data: ACCOUNT });
    act(() => result.current.refetchBankAccount());
    await waitFor(() => expect(result.current.hasBankAccount).toBe(true));
    expect(result.current.bankAccountError).toBe(false);
  });

  it('hesap yoksa (null) bilinen eksik: hata değil, yükleniyor değil', async () => {
    mockGetBank.mockResolvedValue({ data: null });
    const { result } = renderForm();
    await waitFor(() => expect(result.current.bankAccountLoading).toBe(false));
    expect(result.current.bankAccountError).toBe(false);
    expect(result.current.hasBankAccount).toBe(false);
  });

  it('düzenlemede IBAN sorgusu çalışmaz ve kapı açıktır', async () => {
    const { result } = renderForm('edit');
    expect(result.current.hasBankAccount).toBe(true);
    expect(mockGetBank).not.toHaveBeenCalled();
  });
});

/**
 * Kapalı başarısız: hesap DOĞRULANAMIYORSA (yükleniyor / hata) gönderim engellenir; ilan
 * sunucuya gitmez. Form bu durumda zaten gizli (`BankAccountGate`), bu son savunma hattı.
 */
describe('useListingForm: gönderimde IBAN kapısı kapalı başarısız', () => {
  const submit = async (setup: () => void) => {
    setup();
    const { result } = renderForm();
    await act(async () => {
      await result.current.handleSubmit();
    });
    return result;
  };

  beforeEach(() => (productsApi.create as jest.Mock).mockClear());

  it('yüklenirken: ilan oluşturulmaz, IBAN istemi çıkar', async () => {
    await submit(() => mockGetBank.mockReturnValue(new Promise(() => {})));
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(appAlert).toHaveBeenCalledWith('Banka Hesabı Gerekli', expect.any(String), expect.any(Array));
  });

  it('okuma hatasında: ilan oluşturulmaz', async () => {
    mockGetBank.mockRejectedValue(new Error('network'));
    const { result } = renderForm();
    await waitFor(() => expect(result.current.bankAccountError).toBe(true), { timeout: 5000 });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(productsApi.create).not.toHaveBeenCalled();
    expect(appAlert).toHaveBeenCalled();
  });

  it('hesap yoksa: ilan oluşturulmaz', async () => {
    mockGetBank.mockResolvedValue({ data: null });
    const { result } = renderForm();
    await waitFor(() => expect(result.current.bankAccountLoading).toBe(false));
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(productsApi.create).not.toHaveBeenCalled();
  });

  it('hesap varsa IBAN kapısı geçilir (sonraki kontrollere ilerler)', async () => {
    mockGetBank.mockResolvedValue({ data: ACCOUNT });
    const { result } = renderForm();
    await waitFor(() => expect(result.current.hasBankAccount).toBe(true));
    (appAlert as jest.Mock).mockClear();
    await act(async () => {
      await result.current.handleSubmit();
    });
    const titles = (appAlert as jest.Mock).mock.calls.map((c) => c[0]);
    expect(titles).not.toContain('Banka Hesabı Gerekli');
  });
});
