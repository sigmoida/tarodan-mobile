/**
 * J114 · İndirim formu EKRANLARI (settings/discounts/new, [id]/edit, products).
 * Eski DiscountFormModal + ProductPickerModal sözleşmeleri ekrana taşındı:
 * - Alan hataları ilgili girdinin altında (appAlert yok); geçersizken API çağrılmaz.
 * - Gövde kurucu aynen: bogo kodsuz create; düzenlemede temizlenen alanlar null.
 * - Başarı: `router.back()` + toast; sunucu hatası `toast.error`, ekran kalır.
 * - Ürün seçimi ayrı ekranda; geri dönüşte seçili ürünler formda.
 * - Taslak koruması: kirli formdan çıkış onay ister.
 */
import React from 'react';
import { TextInput } from 'react-native';
import { act, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { appAlert, toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import {
  backMock,
  canGoBackMock,
  emitBeforeRemove,
  mockRealisticExit,
  pushMock,
  resetRouterMocks,
} from '@/test-utils/router-mock';

// Odak simülasyonu: gerçek useFocusEffect gibi kayıt tutar; `refocus()` ekrana
// geri dönüşü (blur → focus) taklit eder — ürün seçiciden dönüş bunu kullanır.
type FocusEntry = { cb: () => void | (() => void); cleanup?: void | (() => void) };
const mockFocus = new Set<FocusEntry>();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    ...require('@/test-utils/router-mock').routerMock,
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (cb: () => void | (() => void)) => {
      useEffect(() => {
        const entry: FocusEntry = { cb, cleanup: cb() };
        mockFocus.add(entry);
        return () => {
          mockFocus.delete(entry);
          if (typeof entry.cleanup === 'function') entry.cleanup();
        };
      }, [cb]);
    },
  };
});
const refocus = () =>
  act(() => {
    mockFocus.forEach((entry) => {
      if (typeof entry.cleanup === 'function') entry.cleanup();
      entry.cleanup = entry.cb();
    });
  });

type MockAuthState = { isAuthenticated: boolean; user: { id: string; isSeller: boolean } | null };
let mockAuthState: MockAuthState = { isAuthenticated: true, user: { id: 'u1', isSeller: true } };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: MockAuthState) => unknown) => (sel ? sel(mockAuthState) : mockAuthState),
}));

jest.mock('@/lib/api', () => ({
  discountsApi: { getAll: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  productsApi: { getMyListings: jest.fn() },
}));
import { discountsApi, productsApi } from '@/lib/api';

import NewDiscountScreen from '../new';
import EditDiscountScreen from '../[id]/edit';
import DiscountProductsScreen from '../products';
import { useProductPickerDraft } from '../_lib/productPickerDraft';

const create = discountsApi.create as jest.Mock;
const update = discountsApi.update as jest.Mock;

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

const nameInput = () => screen.UNSAFE_getAllByType(TextInput)[0]!;

let success: jest.SpyInstance;
let errorToast: jest.SpyInstance;
/** Her çıkış denemesinin koruma sonucu (gerçekçi: `router.back()` GO_BACK'i erteler). */
let exits: ReturnType<typeof mockRealisticExit>;
beforeEach(() => {
  resetRouterMocks();
  canGoBackMock.mockReturnValue(true);
  exits = mockRealisticExit();
  mockParams = {};
  mockAuthState = { isAuthenticated: true, user: { id: 'u1', isSeller: true } };
  (discountsApi.getAll as jest.Mock).mockResolvedValue({ data: { items: [discountFixture()] } });
  (productsApi.getMyListings as jest.Mock).mockResolvedValue({ data: { data: [] } });
  create.mockReset();
  update.mockReset();
  (appAlert as jest.Mock).mockImplementation(() => undefined);
  success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
  errorToast = jest.spyOn(toast, 'error').mockImplementation(() => 1);
  useProductPickerDraft.setState({ active: false, selectedIds: [] });
});
afterEach(() => {
  backMock.mockReset();
  success.mockRestore();
  errorToast.mockRestore();
});

describe('J114 · yeni indirim ekranı — validasyon', () => {
  it('J114.5 ekran açılır: başlık + alanlar + tarih seçicileri (DateField)', () => {
    renderWithProviders(<NewDiscountScreen />);
    expect(screen.getByText('Yeni İndirim')).toBeOnTheScreen();
    expect(screen.getByText('İndirim Adı *')).toBeOnTheScreen();
    expect(screen.getByTestId('discount-start-date')).toBeOnTheScreen();
    expect(screen.getByTestId('discount-end-date')).toBeOnTheScreen();
  });

  it('J114.6 ad boşken Oluştur → ad alanında hata, appAlert yok, create çağrılmaz', async () => {
    renderWithProviders(<NewDiscountScreen />);
    fireEvent.press(screen.getByText('Oluştur'));
    expect(await screen.findByText('İndirim adı gerekli.')).toBeOnTheScreen();
    expect(appAlert).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('J114.7 değer 0/negatif → geçerli değer hatası', async () => {
    renderWithProviders(<NewDiscountScreen />);
    fireEvent.changeText(nameInput(), 'Test');
    fireEvent.changeText(screen.getByDisplayValue('10'), '-5');
    fireEvent.press(screen.getByText('Oluştur'));
    expect(await screen.findByText('Geçerli bir indirim değeri girin.')).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
  });

  it('J114.8 yüzde değer 100 üstü → hata', async () => {
    renderWithProviders(<NewDiscountScreen />);
    fireEvent.changeText(nameInput(), 'Test');
    fireEvent.changeText(screen.getByDisplayValue('10'), '150');
    fireEvent.press(screen.getByText('Oluştur'));
    expect(await screen.findByText("Yüzde indirim 100'den büyük olamaz.")).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
  });

  it('J114.9 bogo formu kodsuz create gövdesi yollar; başarı → router.back + toast', async () => {
    create.mockResolvedValue({ data: {} });
    renderWithProviders(<NewDiscountScreen />);
    fireEvent.changeText(nameInput(), 'Bogo');
    fireEvent.press(screen.getByText('Al X, Y Bedava (otomatik)'));
    // Adet koşullu kampanya kod istemez
    expect(screen.queryByText('Kupon Kodu (opsiyonel)')).toBeNull();
    fireEvent.changeText(screen.getByPlaceholderText('Örn: 2 (3 al 2 öde için 2)'), '2');
    fireEvent.changeText(screen.getByPlaceholderText('Örn: 1'), '1');
    fireEvent.press(screen.getByText('Oluştur'));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'bogo', code: undefined, value: 0, buyQuantity: 2, getQuantity: 1 }),
    );
    await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
    expect(success).toHaveBeenCalledWith('İndirim oluşturuldu');
    // Kayıttan sonra çıkış onay istemez: ertelenmiş GO_BACK geldiğinde koruma hâlâ kapalı.
    await waitFor(() => expect(exits).toHaveLength(1));
    expect(exits[0]).toEqual(expect.objectContaining({ prevented: false }));
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('J114.10 bulk_quantity: en az adet 2den küçükse reddedilir', async () => {
    renderWithProviders(<NewDiscountScreen />);
    fireEvent.changeText(nameInput(), 'Toplu');
    fireEvent.press(screen.getByText('Çoklu Alım İndirimi (otomatik)'));
    fireEvent.changeText(screen.getByPlaceholderText('Örn: 3 (aynı üründen 3 adet)'), '1');
    fireEvent.press(screen.getByText('Oluştur'));
    expect(await screen.findByText('En az adet 2 veya üzeri olmalı')).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
  });

  it('J114.11 alan hatası ilgili girdinin altında; düzeltilince gönderim geçer (bogo)', async () => {
    create.mockResolvedValue({ data: {} });
    renderWithProviders(<NewDiscountScreen />);
    fireEvent.changeText(nameInput(), 'Bogo');
    fireEvent.press(screen.getByText('Al X, Y Bedava (otomatik)'));
    fireEvent.changeText(screen.getByPlaceholderText('Örn: 2 (3 al 2 öde için 2)'), '2');
    fireEvent.press(screen.getByText('Oluştur'));
    expect(await screen.findByText("'Bedava' adedi en az 1 olmalı")).toBeOnTheScreen();
    expect(screen.queryByText("'Al' adedi en az 1 olmalı")).toBeNull();
    expect(create).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByPlaceholderText('Örn: 1'), '1');
    fireEvent.press(screen.getByText('Oluştur'));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  });

  it('sunucu hatası → toast.error (sunucu mesajı), ekran açık kalır', async () => {
    create.mockRejectedValue({ response: { status: 409, data: { message: ['Bu kod kullanımda'] } } });
    renderWithProviders(<NewDiscountScreen />);
    fireEvent.changeText(nameInput(), 'Test');
    fireEvent.press(screen.getByText('Oluştur'));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith('Bu kod kullanımda'));
    expect(backMock).not.toHaveBeenCalled();
    expect(screen.getByText('Oluştur')).toBeOnTheScreen();
    expect(appAlert).not.toHaveBeenCalled();
  });
});

describe('discount form: amount text (shared TL amount parser, web parity)', () => {
  const REFUSED = 'Tutar kabul edilmedi. Binlik ayracı kullanmayın; kuruş için virgül kullanın, örn. 1250,50';
  const fixedForm = () => {
    renderWithProviders(<NewDiscountScreen />);
    fireEvent.changeText(nameInput(), 'Sabit');
    fireEvent.press(screen.getByText('Sabit (TL)'));
  };

  it('"1.000" is Turkish grouping: refused under the field, no request, never 1 TL', async () => {
    fixedForm();
    fireEvent.changeText(screen.getByTestId('discount-value'), '1.000');
    fireEvent.changeText(screen.getByTestId('discount-min-cart'), '2.500');
    fireEvent.press(screen.getByText('Oluştur'));
    expect(await screen.findAllByText(REFUSED)).toHaveLength(2);
    expect(create).not.toHaveBeenCalled();
  });

  it('sends "1000" and "1250,50" exactly; the field keeps the comma as typed', async () => {
    create.mockResolvedValue({ data: {} });
    fixedForm();
    fireEvent.changeText(screen.getByTestId('discount-value'), '1250,50');
    fireEvent.changeText(screen.getByTestId('discount-min-cart'), '1000');
    expect(screen.getByTestId('discount-value').props.value).toBe('1250,50');
    fireEvent.press(screen.getByText('Oluştur'));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fixed_amount', value: 1250.5, minCartValue: 1000 }),
    );
  });

  it('edit prefills amounts with a decimal comma', async () => {
    mockParams = { id: 'd3' };
    (discountsApi.getAll as jest.Mock).mockResolvedValue({
      data: {
        items: [discountFixture({ id: 'd3', type: 'fixed_amount', value: 1250.5, minCartValue: 1000, maxDiscountAmount: 99.9 })],
      },
    });
    renderWithProviders(<EditDiscountScreen />);
    await waitFor(() => expect(screen.getByTestId('discount-value').props.value).toBe('1250,50'));
    expect(screen.getByTestId('discount-min-cart').props.value).toBe('1000');
    expect(screen.getByTestId('discount-max-discount').props.value).toBe('99,90');
  });
});

describe('J114.12 indirimi düzenle ekranı', () => {
  it('bogo -> yüzde; PATCH gövdesinde eski adet alanları null gider', async () => {
    mockParams = { id: 'd2' };
    (discountsApi.getAll as jest.Mock).mockResolvedValue({
      data: {
        items: [discountFixture({ id: 'd2', name: '2 Al 1 Öde', code: null, type: 'bogo', value: 0, buyQuantity: 2, getQuantity: 1 })],
      },
    });
    update.mockResolvedValue({ data: {} });
    renderWithProviders(<EditDiscountScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('2 Al 1 Öde')).toBeOnTheScreen());
    expect(screen.getByText('İndirimi Düzenle')).toBeOnTheScreen();
    // Kayıt geri yüklendi: bogo alanları dolu.
    expect(screen.getByDisplayValue('2')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Yüzde (%)'));
    // bogo has no value, so the value field opens empty.
    fireEvent.changeText(screen.getByTestId('discount-value'), '15');
    fireEvent.press(screen.getByText('Güncelle'));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const [id, payload] = update.mock.calls[0];
    expect(id).toBe('d2');
    expect(payload).toMatchObject({
      type: 'percentage',
      value: 15,
      buyQuantity: null,
      getQuantity: null,
      minQuantity: null,
    });
    expect(create).not.toHaveBeenCalled();
    await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
    expect(success).toHaveBeenCalledWith('İndirim güncellendi');
  });

  it('kayıt yoksa "bulunamadı" boş durumu (form çizilmez)', async () => {
    mockParams = { id: 'yok' };
    renderWithProviders(<EditDiscountScreen />);
    expect(await screen.findByText('Sayfa Bulunamadı')).toBeOnTheScreen();
    expect(screen.queryByText('Güncelle')).toBeNull();
  });

  it('satıcı değilse form yerine "Satıcı Olun" kapısı', () => {
    mockAuthState = { isAuthenticated: true, user: { id: 'u1', isSeller: false } };
    mockParams = { id: 'd1' };
    renderWithProviders(<EditDiscountScreen />);
    expect(screen.getByText('Satıcı Olun')).toBeOnTheScreen();
  });
});

describe('Ürün seçimi — ayrı ekran + taslak', () => {
  it('kapsam "Seçili Ürünler" + ürün yok → hata; seçici ekranı itilir, dönüşte seçim formda', async () => {
    create.mockResolvedValue({ data: {} });
    renderWithProviders(<NewDiscountScreen />);
    fireEvent.changeText(nameInput(), 'Ürün indirimi');
    fireEvent.press(screen.getByText('Seçili Ürünler'));
    fireEvent.press(screen.getByText('Oluştur'));
    expect(await screen.findByText('Lütfen en az bir ürün seçin.')).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('discount-pick-products'));
    expect(pushMock).toHaveBeenCalledWith('/settings/discounts/products');
    expect(useProductPickerDraft.getState()).toMatchObject({ active: true, selectedIds: [] });

    // Seçici ekranında iki ürün işaretlendi, sonra forma dönüldü.
    act(() => {
      useProductPickerDraft.getState().toggle('p1');
      useProductPickerDraft.getState().toggle('p2');
    });
    refocus();

    expect(await screen.findByText('2 ürün seçildi')).toBeOnTheScreen();
    expect(screen.queryByText('Lütfen en az bir ürün seçin.')).toBeNull();
    expect(useProductPickerDraft.getState().active).toBe(false);

    fireEvent.press(screen.getByText('Oluştur'));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toMatchObject({ scope: 'product', targetProductIds: ['p1', 'p2'] });
  });

  it('seçici ekranı: ürünler listelenir, dokunuş taslağı günceller, "Tamam" geri döner', async () => {
    canGoBackMock.mockReturnValue(true);
    (productsApi.getMyListings as jest.Mock).mockResolvedValue({
      data: { data: [{ id: 'p1', title: 'Model Araba', price: 100 }, { id: 'p2', title: 'Tren', price: 250 }] },
    });
    useProductPickerDraft.getState().open(['p2']);
    renderWithProviders(<DiscountProductsScreen />);

    fireEvent.press(await screen.findByTestId('discount-product-p1'));
    expect(useProductPickerDraft.getState().selectedIds).toEqual(['p2', 'p1']);
    fireEvent.press(screen.getByTestId('discount-product-p2'));
    expect(useProductPickerDraft.getState().selectedIds).toEqual(['p1']);

    fireEvent.press(screen.getByTestId('discount-products-done'));
    expect(backMock).toHaveBeenCalledTimes(1);
  });

  it('seçici ekranı: aktif ürün yoksa boş durum', async () => {
    renderWithProviders(<DiscountProductsScreen />);
    expect(await screen.findByText('Aktif ürününüz yok.')).toBeOnTheScreen();
  });
});

describe('Taslak koruması (geri oku / Android geri tuşu)', () => {
  it('dokunulmamış form → çıkış serbest', () => {
    renderWithProviders(<NewDiscountScreen />);
    expect(emitBeforeRemove().prevented).toBe(false);
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('kirli form → çıkış durur ve onay sorulur', () => {
    renderWithProviders(<NewDiscountScreen />);
    fireEvent.changeText(nameInput(), 'Yarım kalan');
    expect(emitBeforeRemove().prevented).toBe(true);
    expect(appAlert).toHaveBeenCalledWith(
      'Kaydedilmemiş değişiklikler',
      'Yaptığınız değişiklikler kaybolacak. Formu kapatmak istiyor musunuz?',
      expect.any(Array),
      expect.anything(),
    );
  });
});
