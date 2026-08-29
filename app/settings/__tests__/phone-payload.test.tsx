/**
 * Telefon — EKRAN seviyesinde "mock'a gerçekten giden değer".
 *
 * Util testleri (`src/utils/__tests__/phone.test.ts`) kuralı çiviliyor; burada
 * kanıtlanan şey, kullanıcının ALANA yazdığı metnin API'ye ne olarak gittiği.
 * REGRESYON: `05321234567890` eskiden sessizce kırpılıp `+905321234567` olarak
 * gönderiliyordu — kullanıcı hiçbir hata görmüyor, kayıt ULAŞILAMAZ telefonla
 * yapılıyordu. Artık gönderim durur ve hata görünür.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { appAlert } from '@/ui';
import { getPhoneInvalidMessage } from '@/utils/phone';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useFocusEffect: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// İl/ilçe seçici testID'siz iki modal listesi — telefon davranışıyla ilgisi yok,
// düz TextInput'a indiriliyor. `PhoneInput` bilerek GERÇEK bırakıldı: test
// edilen şey tam olarak onun formatlaması + doğrulaması.
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

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({
    isAuthenticated: true,
    limits: { maxAddresses: 10 },
    user: { displayName: 'Test', email: 't@b.com', membershipTier: 'free' },
    refreshUserData: jest.fn(),
    updateUser: jest.fn(),
  });
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn().mockResolvedValue({ data: { id: 'a1' } }),
    patch: jest.fn().mockResolvedValue({ data: { id: 'a1' } }),
    delete: jest.fn(),
  },
  userApi: { updateProfile: jest.fn().mockResolvedValue({ data: {} }) },
  mediaApi: { uploadAvatar: jest.fn() },
}));
import { api, userApi } from '@/lib/api';

import AddressesScreen from '../addresses';
import EditProfileScreen from '../edit-profile';

const post = api.post as jest.Mock;
const updateProfile = userApi.updateProfile as jest.Mock;

describe('Adres formu — alana yazılan telefon payload\'a ne olarak gidiyor', () => {
  beforeEach(() => {
    post.mockClear();
    (appAlert as jest.Mock).mockImplementation(() => {});
  });

  const fillAndSave = async (phone: string) => {
    renderWithProviders(<AddressesScreen />);
    fireEvent.press(await screen.findByText('Adres Ekle'));
    fireEvent.changeText(screen.getByTestId('address-title-input'), 'Ev');
    fireEvent.changeText(screen.getByTestId('address-fullname-input'), 'Ayşe Yılmaz');
    fireEvent.changeText(screen.getByTestId('address-phone-input'), phone);
    fireEvent.changeText(
      screen.getByTestId('address-address-input'),
      'Örnek Mahallesi Test Caddesi No:12',
    );
    fireEvent.changeText(screen.getByTestId('mock-city'), 'İstanbul');
    fireEvent.changeText(screen.getByTestId('mock-district'), 'Kadıköy');
    fireEvent.press(screen.getByTestId('address-save-button'));
  };

  it.each([
    ['0532 123 45 67'],
    ['+90 532 123 45 67'],
    ['532 123 45 67'],
    ['(0532) 123-45-67'],
    ['5321234567'],
    ['905321234567'],
  ])('%s → API\'ye "+905321234567" gider', async (input) => {
    await fillAndSave(input);
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]![1]).toMatchObject({ phone: '+905321234567' });
  });

  it.each([['00905321234567'], ['+1 415 555 0100'], ['05321234567890'], ['0432 123 45 67']])(
    '%s → gönderim DURUR, kırpılmış numara API\'ye SIZMAZ',
    async (input) => {
      await fillAndSave(input);
      await waitFor(() => expect(appAlert).toHaveBeenCalled());
      expect(post).not.toHaveBeenCalled();
      expect(await screen.findByText(getPhoneInvalidMessage())).toBeTruthy();
    },
  );

  it('fazla haneli girdi alanda KIRPILMAZ — kullanıcı yazdığını görür', async () => {
    renderWithProviders(<AddressesScreen />);
    fireEvent.press(await screen.findByText('Adres Ekle'));
    const input = screen.getByTestId('address-phone-input');
    fireEvent.changeText(input, '05321234567890');
    // Kırpma olsaydı burada "532 123 45 67" görünür, 890 sessizce kaybolurdu.
    expect(input.props.value).toBe('05321234567890');
  });

  it('blur\'da hata görünür, numara düzeltilince anında kalkar', async () => {
    renderWithProviders(<AddressesScreen />);
    fireEvent.press(await screen.findByText('Adres Ekle'));
    const input = screen.getByTestId('address-phone-input');

    fireEvent.changeText(input, '00905321234567');
    expect(screen.queryByText(getPhoneInvalidMessage())).toBeNull(); // yazarken cezalandırma yok
    fireEvent(input, 'blur');
    expect(await screen.findByText(getPhoneInvalidMessage())).toBeTruthy();

    fireEvent.changeText(input, '0532 123 45 67');
    await waitFor(() => expect(screen.queryByText(getPhoneInvalidMessage())).toBeNull());
  });
});

describe('Profil formu — alana yazılan telefon payload\'a ne olarak gidiyor', () => {
  beforeEach(() => updateProfile.mockClear());

  const fillAndSave = (phone: string) => {
    renderWithProviders(<EditProfileScreen />);
    fireEvent.changeText(screen.getByTestId('profile-phone-input'), phone);
    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));
  };

  it.each([['0532 123 45 67'], ['+90 532 123 45 67'], ['5321234567']])(
    '%s → API\'ye "+905321234567" gider',
    async (input) => {
      fillAndSave(input);
      await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
      expect(updateProfile.mock.calls[0]![0]).toMatchObject({ phone: '+905321234567' });
    },
  );

  it.each([['00905321234567'], ['+1 415 555 0100'], ['05321234567890']])(
    '%s → kaydetme DURUR ve alanda hata görünür',
    async (input) => {
      fillAndSave(input);
      await waitFor(() => expect(screen.getByText(getPhoneInvalidMessage())).toBeTruthy());
      expect(updateProfile).not.toHaveBeenCalled();
    },
  );

  it('telefon boş bırakılabilir (numara silme) — hata çıkmaz', async () => {
    renderWithProviders(<EditProfileScreen />);
    fireEvent.press(screen.getByText('Değişiklikleri Kaydet'));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(getPhoneInvalidMessage())).toBeNull();
  });

  it('20 karakteri aşan girdide zod un İNGİLİZCE mesajı görünmez', async () => {
    // Şemadaki `max(20)` formatlayıcı kırptığı sürece ULAŞILAMAZDI; ham metin
    // alanda kalmaya başlayınca canlandı ve "String must contain at most 20
    // character(s)" basıyordu. Üstelik zod resolver'ı `onSubmit`'teki Türkçe
    // kapıdan ÖNCE koştuğu için o kapı hiç çalışmıyordu.
    fillAndSave('+90 532 123 45 6789 0123');
    await waitFor(() => expect(screen.getByText(getPhoneInvalidMessage())).toBeTruthy());
    expect(screen.queryByText(/String must contain/i)).toBeNull();
    expect(screen.queryByText(/at most 20/i)).toBeNull();
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
