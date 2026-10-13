/**
 * J114 · Satıcı indirim yönetimi — mobil UI dilimi (LİSTE ekranı).
 * Satıcı/giriş gate, kendi indirimleri liste render + değer rozeti, boş durum,
 * form ekranlarına yönlendirme, silme onayı. Form validasyonu (J114.6-12) ayrı
 * ekranlarda: `app/settings/discounts/__tests__/discount-form.test.tsx`.
 * Kupon iş kuralları (kullanım limiti, stacking, escrow) backendOnly.
 */
import React from 'react';
import { appAlert, toast } from '@/ui';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks, pushMock } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

let mockAuthState: any = {
  isAuthenticated: true,
  user: { id: 'u1', isSeller: true },
};
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuthState;
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  discountsApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  productsApi: { getMyListings: jest.fn() },
}));
import { discountsApi, productsApi } from '@/lib/api';
const mockGetAll = discountsApi.getAll as jest.Mock;
const mockGetListings = productsApi.getMyListings as jest.Mock;

import DiscountsScreen from '../discounts';

function discountFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd1',
    code: 'YAZ10',
    name: 'Yaz İndirimi',
    description: 'Tüm mağaza',
    type: 'percentage',
    value: 10,
    scope: 'seller',
    targetProductIds: [],
    minCartValue: null,
    maxDiscountAmount: null,
    usageLimitTotal: 100,
    usageLimitPerUser: 1,
    usedCount: 5,
    isStackable: false,
    isActive: true,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    isCurrentlyValid: true,
    ...overrides,
  };
}

describe('J114 · indirim yönetimi (settings/discounts)', () => {
  let alertSpy: jest.Mock;

  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: { id: 'u1', isSeller: true } };
    mockGetAll.mockResolvedValue({ data: { items: [discountFixture()] } });
    mockGetListings.mockResolvedValue({ data: { data: [] } });
    alertSpy = (appAlert as jest.Mock).mockImplementation(() => {});
    (discountsApi.create as jest.Mock).mockClear();
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('J114.1 kendi indirimleri liste + yüzde değer rozeti render edilir', async () => {
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByText('Yaz İndirimi')).toBeOnTheScreen());
    expect(screen.getByText('YAZ10')).toBeOnTheScreen();
    expect(screen.getByText('%10')).toBeOnTheScreen();
  });

  it('J114.2 indirim yoksa boş durum gösterilir', async () => {
    mockGetAll.mockResolvedValue({ data: { items: [] } });
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() =>
      expect(screen.getByText('Henüz indiriminiz yok')).toBeOnTheScreen(),
    );
  });

  it('J114.3 giriş yoksa satıcı/giriş gate gösterilir (liste yok)', async () => {
    mockAuthState = { isAuthenticated: false, user: null };
    renderWithProviders(<DiscountsScreen />);
    expect(screen.getByText('Giriş Gerekli')).toBeOnTheScreen();
    expect(screen.queryByText('Yaz İndirimi')).toBeNull();
  });

  it('J114.4 satıcı değilse "Satıcı Olun" gate gösterilir', async () => {
    mockAuthState = { isAuthenticated: true, user: { id: 'u1', isSeller: false } };
    renderWithProviders(<DiscountsScreen />);
    expect(screen.getByText('Satıcı Olun')).toBeOnTheScreen();
  });

  it('J114.5 FAB → yeni indirim EKRANI itilir (modal yok)', async () => {
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByText('Yaz İndirimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByLabelText('Yeni indirim oluştur'));
    expect(pushMock).toHaveBeenCalledWith('/settings/discounts/new');
    expect(screen.queryByText('İndirim Adı *')).toBeNull();
  });

  it('J114.5b kartta düzenle → /settings/discounts/<id>/edit', async () => {
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByText('Yaz İndirimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByLabelText('İndirimi Düzenle'));
    expect(pushMock).toHaveBeenCalledWith('/settings/discounts/d1/edit');
  });

  it('J114.5c silme: mevcut appAlert onayı; sunucu hatası toast.error (appAlert değil)', async () => {
    (discountsApi.delete as jest.Mock).mockRejectedValue({
      response: { status: 409, data: { message: 'Kullanımda olan indirim silinemez' } },
    });
    const errorToast = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByText('Yaz İndirimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByLabelText('İndirimi Sil'));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [, , buttons] = alertSpy.mock.calls[0];
    buttons.find((b: { style?: string }) => b.style === 'destructive').onPress();
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith('Kullanımda olan indirim silinemez'));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    errorToast.mockRestore();
  });
});
