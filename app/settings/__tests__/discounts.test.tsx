/**
 * J114 · Satıcı indirim yönetimi — mobil UI dilimi.
 * Yalnız MOBİL-UI: satıcı/giriş gate, kendi indirimleri liste render + değer rozeti,
 * boş durum, indirim formu açılışı, form validasyonu (ad zorunlu, negatif/0 değer reddi,
 * yüzde>100 reddi) Alert üzerinden. Kupon oluşturma/iş kuralları (kullanım limiti
 * uygulanması, stacking, escrow) backendOnly.
 */
import React from 'react';
import { appAlert } from '@/ui';
import { TextInput } from 'react-native';
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

  it('J114.5 form açılır (Yeni İndirim alanları görünür)', async () => {
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByText('Yaz İndirimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByLabelText('Yeni indirim oluştur'));
    await waitFor(() =>
      expect(screen.getByText('İndirim Adı *')).toBeOnTheScreen(),
    );
  });

  it('J114.6 ad boşken Oluştur → eksik Alert, create çağrılmaz', async () => {
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByText('Yaz İndirimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByLabelText('Yeni indirim oluştur'));
    await waitFor(() => expect(screen.getByText('İndirim Adı *')).toBeOnTheScreen());

    fireEvent.press(screen.getByText('Oluştur'));
    expect(alertSpy).toHaveBeenCalledWith('Eksik', 'İndirim adı gerekli.');
    expect(discountsApi.create).not.toHaveBeenCalled();
  });

  it('J114.7 değer 0/negatif → geçerli değer Alert (negatif değer reddi)', async () => {
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByText('Yaz İndirimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByLabelText('Yeni indirim oluştur'));
    await waitFor(() => expect(screen.getByText('İndirim Adı *')).toBeOnTheScreen());

    // İlk TextInput = İndirim Adı (label Text ayrı node olduğu için type ile bul).
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], 'Test');
    fireEvent.changeText(screen.getByDisplayValue('10'), '-5');
    fireEvent.press(screen.getByText('Oluştur'));
    expect(alertSpy).toHaveBeenCalledWith('Eksik', 'Geçerli bir indirim değeri girin.');
    expect(discountsApi.create).not.toHaveBeenCalled();
  });

  it('J114.8 yüzde değer 100 üstü → hata Alert', async () => {
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByText('Yaz İndirimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByLabelText('Yeni indirim oluştur'));
    await waitFor(() => expect(screen.getByText('İndirim Adı *')).toBeOnTheScreen());

    const inputs = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], 'Test');
    fireEvent.changeText(screen.getByDisplayValue('10'), '150');
    fireEvent.press(screen.getByText('Oluştur'));
    expect(alertSpy).toHaveBeenCalledWith('Hata', "Yüzde indirim 100'den büyük olamaz.");
    expect(discountsApi.create).not.toHaveBeenCalled();
  });
  it('J114.9 bogo kartı özet gösterir; bogo formu kodsuz create gövdesi yollar', async () => {
    mockGetAll.mockResolvedValue({
      data: { items: [discountFixture({ id: 'd2', name: '2 Al 1 Öde', code: null, type: 'bogo', value: 0, buyQuantity: 2, getQuantity: 1 })] },
    });
    (discountsApi.create as jest.Mock).mockResolvedValue({ data: {} });
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByText('2 Al 1 Öde')).toBeOnTheScreen());
    expect(screen.getByText('2 al 1 bedava (otomatik)')).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Yeni indirim oluştur'));
    await waitFor(() => expect(screen.getByText('İndirim Adı *')).toBeOnTheScreen());
    fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], 'Bogo');
    fireEvent.press(screen.getByText('Al X, Y Bedava (otomatik)'));
    // Adet koşullu kampanya kod istemez
    expect(screen.queryByText('Kupon Kodu (opsiyonel)')).toBeNull();
    fireEvent.changeText(screen.getByPlaceholderText('Örn: 2 (3 al 2 öde için 2)'), '2');
    fireEvent.changeText(screen.getByPlaceholderText('Örn: 1'), '1');
    fireEvent.press(screen.getByText('Oluştur'));
    await waitFor(() => expect(discountsApi.create).toHaveBeenCalledTimes(1));
    expect(discountsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'bogo', code: undefined, value: 0, buyQuantity: 2, getQuantity: 1 }),
    );
  });

  it('J114.10 bulk_quantity: en az adet 2den küçükse reddedilir', async () => {
    renderWithProviders(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByText('Yaz İndirimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByLabelText('Yeni indirim oluştur'));
    await waitFor(() => expect(screen.getByText('İndirim Adı *')).toBeOnTheScreen());
    fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], 'Toplu');
    fireEvent.press(screen.getByText('Çoklu Alım İndirimi (otomatik)'));
    fireEvent.changeText(screen.getByPlaceholderText('Örn: 3 (aynı üründen 3 adet)'), '1');
    fireEvent.press(screen.getByText('Oluştur'));
    expect(alertSpy).toHaveBeenCalledWith('Hata', 'En az adet 2 veya üzeri olmalı');
    expect(discountsApi.create).not.toHaveBeenCalled();
  });
});
