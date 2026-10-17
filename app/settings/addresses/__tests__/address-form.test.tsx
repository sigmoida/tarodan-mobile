/**
 * Adres formu EKRANLARI (settings/addresses/new + [id]/edit) — eski
 * AddressFormModal'ın davranış sözleşmeleri ekrana taşındı:
 * - J32 / J388: zorunlu alan / API DTO sınırları (ad soyad 2–100, başlık ≤ 50, adres 10–500,
 *   posta kodu ≤ 10) / telefon doğrulaması istemcide; geçmeden API çağrılmaz. Her hatalı alan
 *   satır içi hata alır (il/ilçe dahil), düzeltince kalkar.
 * - Özet satırı alt çubukta `FormError`: hatalı alanların ADLARI — appAlert YOK.
 * - Başarı: `router.back()` + `toast.success`; sunucu hatası `toast.error` + formda kalıcı, ekran kalır.
 * - Taslak koruması: kirli formdan çıkış (geri oku / Android geri) onay ister. `router.back()`
 *   GERÇEKÇİ (ertelenmiş GO_BACK, `mockRealisticExit`): başarılı kayıttan sonra diyalog ÇIKMAZ.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { appAlert, toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import {
  backMock,
  canGoBackMock,
  emitBeforeRemove,
  mockRealisticExit,
  navigationDispatchMock,
  resetRouterMocks,
} from '@/test-utils/router-mock';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-i18next', () => ({
  // Özet satırı alan adlarını `{fields}` ile taşır: testte görünür olsun.
  useTranslation: () => ({
    t: (k: string, o?: { fields?: string }) => (o?.fields !== undefined ? `${k}: ${o.fields}` : k),
  }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true, limits: { maxAddresses: 10 } };
    return sel ? sel(state) : state;
  },
}));

// İl/ilçe seçici iki sheet listesi — form davranışıyla ilgisi yok, düz TextInput'a indirilir.
jest.mock('@/components/common', () => {
  const actual = jest.requireActual('@/components/common');
  const { TextInput } = require('react-native');
  const MockCityDistrictSelector = ({ city, district, onChangeCity, onChangeDistrict }: any) => (
    <>
      <TextInput testID="mock-city" value={city} onChangeText={onChangeCity} />
      <TextInput testID="mock-district" value={district} onChangeText={onChangeDistrict} />
    </>
  );
  return { ...actual, CityDistrictSelector: MockCityDistrictSelector };
});

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  addressesApi: { setDefault: jest.fn() },
}));
import { api } from '@/lib/api';

import NewAddressScreen from '../new';
import EditAddressScreen from '../[id]/edit';

const post = api.post as jest.Mock;
const patch = api.patch as jest.Mock;
const get = api.get as jest.Mock;

const ALL_REQUIRED_SUMMARY =
  'address.checkFields: address.addressTitleLabel, address.fullName, address.phone, address.address, address.city, address.district';

const fillValid = () => {
  fireEvent.changeText(screen.getByTestId('address-title-input'), 'Ev');
  fireEvent.changeText(screen.getByTestId('address-fullname-input'), 'Ayşe Yılmaz');
  fireEvent.changeText(screen.getByTestId('address-phone-input'), '0532 123 45 67');
  fireEvent.changeText(screen.getByTestId('address-address-input'), 'Örnek Mahallesi Test Caddesi No:12');
  fireEvent.changeText(screen.getByTestId('mock-city'), 'İstanbul');
  fireEvent.changeText(screen.getByTestId('mock-district'), 'Kadıköy');
};
const save = () => fireEvent.press(screen.getByTestId('address-save-button'));

let success: jest.SpyInstance;
let errorToast: jest.SpyInstance;
/** Her çıkış denemesinin (ertelenmiş GO_BACK / dispatch) koruma sonucu. */
let exits: ReturnType<typeof mockRealisticExit>;
beforeEach(() => {
  resetRouterMocks();
  canGoBackMock.mockReturnValue(true);
  exits = mockRealisticExit();
  mockParams = {};
  post.mockReset();
  patch.mockReset();
  get.mockReset();
  get.mockResolvedValue({ data: [] });
  (appAlert as jest.Mock).mockImplementation(() => {});
  success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
  errorToast = jest.spyOn(toast, 'error').mockImplementation(() => 1);
});
afterEach(() => {
  backMock.mockReset();
  navigationDispatchMock.mockReset();
  success.mockRestore();
  errorToast.mockRestore();
});

describe('J32 · yeni adres ekranı — form validasyonu', () => {
  it('J32.1 zorunlu alanlar boşken kaydet → alt çubukta EKSİK ALAN ADLARI, appAlert yok, API çağrılmaz', async () => {
    renderWithProviders(<NewAddressScreen />);
    save();
    expect(await screen.findByText(ALL_REQUIRED_SUMMARY)).toBeTruthy();
    expect(appAlert).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('J32.2 başlık inputu görünür ve düzenlenebilir', () => {
    renderWithProviders(<NewAddressScreen />);
    const titleInput = screen.getByTestId('address-title-input');
    fireEvent.changeText(titleInput, 'Ev');
    expect(screen.getByTestId('address-title-input').props.value).toBe('Ev');
  });

  it('J32.3 boş submit → alanların altında inline "Zorunlu alan" hatası görünür', async () => {
    renderWithProviders(<NewAddressScreen />);
    save();
    // title + fullName + phone + address Input'ları mesajı basar (il/ilçe mesajı: CityDistrictSelector testi).
    const errs = await screen.findAllByText('validation.required');
    expect(errs.length).toBeGreaterThanOrEqual(4);
  });

  it('J32.4 hatalı alanı düzeltince o alanın inline hatası kalkar', async () => {
    renderWithProviders(<NewAddressScreen />);
    save();
    const beforeCount = (await screen.findAllByText('validation.required')).length;
    fireEvent.changeText(screen.getByTestId('address-title-input'), 'Ev');
    await waitFor(() => {
      expect(screen.getAllByText('validation.required').length).toBe(beforeCount - 1);
    });
  });

  it('J32.5 adres 10 karakterden kısa → alan hatası + özet yalnız "Adres", API çağrılmaz', async () => {
    renderWithProviders(<NewAddressScreen />);
    fillValid();
    fireEvent.changeText(screen.getByTestId('address-address-input'), 'Kısa');
    save();
    expect(await screen.findByText('address.checkFields: address.address')).toBeTruthy();
    expect(screen.getByText('validation.minLength')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it('J32.6 API DTO sınırları: ad soyad < 2, başlık > 50, posta kodu > 10 → alan hataları, API çağrılmaz', async () => {
    renderWithProviders(<NewAddressScreen />);
    fillValid();
    fireEvent.changeText(screen.getByTestId('address-fullname-input'), 'A');
    fireEvent.changeText(screen.getByTestId('address-title-input'), 'x'.repeat(51));
    fireEvent.changeText(screen.getByTestId('address-zip-input'), '12345678901');
    save();
    expect(
      await screen.findByText(
        'address.checkFields: address.addressTitleLabel, address.fullName, address.zipCode',
      ),
    ).toBeTruthy();
    expect(screen.getByText('validation.minLength')).toBeTruthy();
    expect(screen.getAllByText('validation.maxLength')).toHaveLength(2);
    expect(post).not.toHaveBeenCalled();
  });

  it('J32.7 alanlar API sınırlarını aşan girişi kabul etmez (maxLength)', () => {
    renderWithProviders(<NewAddressScreen />);
    expect(screen.getByTestId('address-title-input').props.maxLength).toBe(50);
    expect(screen.getByTestId('address-fullname-input').props.maxLength).toBe(100);
    expect(screen.getByTestId('address-address-input').props.maxLength).toBe(500);
    expect(screen.getByTestId('address-zip-input').props.maxLength).toBe(10);
  });
});

describe('Yeni adres — kayıt sonucu', () => {
  it('başarı: POST (zipCode eşlenir, telefon E.164) → router.back + toast.success', async () => {
    post.mockResolvedValue({ data: { id: 'a9' } });
    renderWithProviders(<NewAddressScreen />);
    fillValid();
    fireEvent.changeText(screen.getByTestId('address-zip-input'), '34710');
    save();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]![0]).toBe('/users/me/addresses');
    expect(post.mock.calls[0]![1]).toMatchObject({
      title: 'Ev',
      phone: '+905321234567',
      zipCode: '34710',
      city: 'İstanbul',
      district: 'Kadıköy',
    });
    expect(post.mock.calls[0]![1]).not.toHaveProperty('postalCode');
    expect(post.mock.calls[0]![1]).not.toHaveProperty('phoneCountryCode');
    await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
    expect(success).toHaveBeenCalledWith('address.added');
    // Kayıttan sonra çıkış onay İSTEMEZ (form hâlâ "kirli" olsa da). GO_BACK ertelenmiş
    // (expo-router 6 kuyruğu) gönderilir; o ana dek koruma YENİDEN KURULMAMIŞ olmalı.
    await waitFor(() => expect(exits).toHaveLength(1));
    expect(exits[0]).toEqual(expect.objectContaining({ prevented: false }));
    expect(appAlert).not.toHaveBeenCalled();
    // Ekran kapanana dek koruma kapalı kalır (geç gelen ikinci çıkış da serbest).
    expect(emitBeforeRemove().prevented).toBe(false);
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('sunucu hatası → toast.error + formda KALICI (tüm satırlar), ekran açık kalır', async () => {
    post.mockRejectedValue({
      response: { status: 400, data: { message: ['Adres geçersiz', 'İlçe geçersiz'] } },
    });
    renderWithProviders(<NewAddressScreen />);
    fillValid();
    save();
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith('Adres geçersiz'));
    expect(await screen.findByText('Adres geçersiz\nİlçe geçersiz')).toBeTruthy();
    expect(backMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('address-save-button')).toBeTruthy();
    expect(appAlert).not.toHaveBeenCalled();
  });
});

describe('Taslak koruması (geri oku / Android geri tuşu)', () => {
  it('dokunulmamış form → çıkış serbest', () => {
    renderWithProviders(<NewAddressScreen />);
    expect(emitBeforeRemove().prevented).toBe(false);
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('kirli form → çıkış durur, onay sorulur; "Değişiklikleri Sil" çıkışı sürdürür', async () => {
    renderWithProviders(<NewAddressScreen />);
    fireEvent.changeText(screen.getByTestId('address-title-input'), 'Ev');
    const { prevented, action } = emitBeforeRemove();
    expect(prevented).toBe(true);
    expect(appAlert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = (appAlert as jest.Mock).mock.calls[0];
    expect(title).toBe('common.unsavedChanges');
    expect(message).toBe('common.unsavedChangesDescription');
    // `confirm()` düğmeleri: devam (cancel) + değişiklikleri sil (yıkıcı). Sırayı AlertDialog dizer.
    expect(buttons).toEqual([
      expect.objectContaining({ text: 'common.continueEditing', style: 'cancel' }),
      expect.objectContaining({ text: 'common.discardChanges', style: 'destructive' }),
    ]);
    buttons.find((b: { style?: string }) => b.style === 'destructive').onPress();
    await waitFor(() => expect(navigationDispatchMock).toHaveBeenCalledWith(action));
    // Bekleyen eylem koruma kalktıktan SONRA yeniden gönderilir → bu kez engellenmez
    // (aksi halde onay döngüsü / iOS'ta yığın ayrışması).
    expect(exits).toEqual([expect.objectContaining({ prevented: false })]);
    expect(appAlert).toHaveBeenCalledTimes(1);
  });

  it('"Düzenlemeye Devam Et" → ekranda kalınır (dispatch yok)', async () => {
    renderWithProviders(<NewAddressScreen />);
    fireEvent.changeText(screen.getByTestId('address-title-input'), 'Ev');
    emitBeforeRemove();
    const [, , buttons] = (appAlert as jest.Mock).mock.calls[0];
    buttons.find((b: { style?: string }) => b.style === 'cancel').onPress();
    await Promise.resolve();
    expect(navigationDispatchMock).not.toHaveBeenCalled();
    expect(emitBeforeRemove().prevented).toBe(true);
  });
});

describe('Adresi düzenle ekranı', () => {
  const ADDRESS = {
    id: 'a1',
    title: 'Ev',
    fullName: 'Ayşe Yılmaz',
    phone: '+905321234567',
    address: 'Örnek Mahallesi Test Caddesi No:12',
    city: 'İstanbul',
    district: 'Kadıköy',
    zipCode: '34710',
    isDefault: true,
  };

  it('kayıttan doldurulur; kaydet → PATCH /:id + router.back + "güncellendi" toast', async () => {
    mockParams = { id: 'a1' };
    get.mockResolvedValue({ data: [ADDRESS] });
    patch.mockResolvedValue({ data: { id: 'a1' } });
    renderWithProviders(<EditAddressScreen />);

    expect(await screen.findByDisplayValue('Ev')).toBeTruthy();
    expect(screen.getByText('address.editAddress')).toBeTruthy();
    expect(screen.getByTestId('address-zip-input').props.value).toBe('34710');

    fireEvent.changeText(screen.getByTestId('address-title-input'), 'Ev 2');
    save();
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0]![0]).toBe('/users/me/addresses/a1');
    expect(patch.mock.calls[0]![1]).toMatchObject({
      title: 'Ev 2',
      phone: '+905321234567',
      zipCode: '34710',
      isDefault: true,
    });
    expect(post).not.toHaveBeenCalled();
    await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
    expect(success).toHaveBeenCalledWith('address.updated');
  });

  it('adres listede yoksa "bulunamadı" boş durumu (form çizilmez)', async () => {
    mockParams = { id: 'yok' };
    get.mockResolvedValue({ data: [ADDRESS] });
    renderWithProviders(<EditAddressScreen />);
    expect(await screen.findByText('error.pageNotFound')).toBeTruthy();
    expect(screen.queryByTestId('address-save-button')).toBeNull();
  });
});
