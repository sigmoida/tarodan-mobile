/**
 * Adres formu EKRANLARI (settings/addresses/new + [id]/edit) — eski
 * AddressFormModal'ın davranış sözleşmeleri ekrana taşındı:
 * - J32 / J388: zorunlu alan / adres < 10 / telefon doğrulaması istemcide;
 *   geçmeden API çağrılmaz. Her hatalı alan satır içi hata alır, düzeltince kalkar.
 * - Özet satırı (eski modal içi mesaj) alt çubukta `FormError` — appAlert YOK.
 * - Başarı: `router.back()` + `toast.success`; sunucu hatası `toast.error`, ekran kalır.
 * - Taslak koruması: kirli formdan çıkış (geri oku / Android geri) onay ister.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { appAlert, toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import {
  backMock,
  emitBeforeRemove,
  navigationDispatchMock,
  resetRouterMocks,
} from '@/test-utils/router-mock';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
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
beforeEach(() => {
  resetRouterMocks();
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
  success.mockRestore();
  errorToast.mockRestore();
});

describe('J32 · yeni adres ekranı — form validasyonu', () => {
  it('J32.1 zorunlu alanlar boşken kaydet → alt çubukta özet, appAlert yok, API çağrılmaz', async () => {
    renderWithProviders(<NewAddressScreen />);
    save();
    expect(await screen.findByText('address.fillRequiredFields')).toBeTruthy();
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
    // title + fullName + phone + address Input'ları mesajı basar (il/ilçe kırmızı çerçeve alır).
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

  it('J32.5 adres 10 karakterden kısa → alan hatası + "adres kısa" özeti, API çağrılmaz', async () => {
    renderWithProviders(<NewAddressScreen />);
    fillValid();
    fireEvent.changeText(screen.getByTestId('address-address-input'), 'Kısa');
    save();
    expect(await screen.findByText('address.addressMinLength')).toBeTruthy();
    expect(screen.getByText('validation.minLength')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
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
    expect(appAlert).not.toHaveBeenCalled();
    // Kayıttan sonra çıkış onay İSTEMEZ (form hâlâ "kirli" olsa da).
    expect(emitBeforeRemove().prevented).toBe(false);
  });

  it('sunucu hatası → toast.error (sunucu mesajı), ekran açık kalır', async () => {
    post.mockRejectedValue({ response: { status: 400, data: { message: ['Adres geçersiz'] } } });
    renderWithProviders(<NewAddressScreen />);
    fillValid();
    save();
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith('Adres geçersiz'));
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

  it('kirli form → çıkış durur, onay sorulur; "Değişiklikleri Sil" çıkışı sürdürür', () => {
    renderWithProviders(<NewAddressScreen />);
    fireEvent.changeText(screen.getByTestId('address-title-input'), 'Ev');
    const { prevented, action } = emitBeforeRemove();
    expect(prevented).toBe(true);
    expect(appAlert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = (appAlert as jest.Mock).mock.calls[0];
    expect(title).toBe('common.unsavedChanges');
    expect(message).toBe('common.unsavedChangesDescription');
    // Vazgeç (cancel) her zaman son düğme.
    expect(buttons[buttons.length - 1]).toMatchObject({ text: 'common.continueEditing', style: 'cancel' });
    buttons.find((b: any) => b.style === 'destructive').onPress();
    expect(navigationDispatchMock).toHaveBeenCalledWith(action);
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
