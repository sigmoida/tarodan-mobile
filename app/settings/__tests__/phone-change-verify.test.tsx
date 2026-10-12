/**
 * B-1.7 · Profilde telefon değişimi doğrulamaya bağlanır.
 *
 * `PATCH /users/me` numara değişince `isPhoneVerified=false` yazar; numara başka
 * hesapta DOĞRULANMAMIŞ duruyorsa numarayı yazmaz ama yine 200 döner (yanıttaki
 * telefon eski numara). Eskiden mobil her iki durumda da "Profil güncellendi"
 * diyordu. Artık:
 *  - numara kaydedildi → "Numaranızı doğrulayın" + Şimdi doğrula → güvenlik ekranı
 *  - numara kaydedilmedi → başarı DEĞİL, açıklayıcı uyarı (+ yine doğrulama yolu)
 *  - güvenlik ekranı `?verifyPhone=` ile açılınca pencere açılır ve kod bir kez gider.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { appAlert } from '@/ui';
import { phoneKey, phoneToSend, resolvePhoneOutcome } from '../edit-profile/_lib/phoneOutcome';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const OLD_PHONE = '+905551112233';
// refreshUserData taze kullanıcıyı döndürür (düşerse null). Varsayılan: null →
// hook PATCH yanıtına geri çekilir.
const mockRefreshUserData = jest.fn((): Promise<any> => Promise.resolve(null));
let mockUser: any;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      isAuthenticated: true,
      logout: jest.fn(),
      user: mockUser,
      refreshUserData: mockRefreshUserData,
    };
    return sel ? sel(state) : state;
  },
}));

const mockSendPhoneCode = jest.fn(() => Promise.resolve({ data: {} }));
jest.mock('@/lib/api', () => ({
  userApi: { updateProfile: jest.fn() },
  mediaApi: { uploadAvatar: jest.fn() },
  authApi: {
    sendPhoneCode: (...args: unknown[]) => mockSendPhoneCode(...(args as [])),
    verifyPhone: jest.fn(() => Promise.resolve({ data: {} })),
    getTwoFactorStatus: jest.fn(() => Promise.resolve({ data: { isEnabled: false } })),
  },
}));
import { userApi } from '@/lib/api';
const updateProfile = userApi.updateProfile as jest.Mock;

import EditProfileScreen from '../edit-profile';
import SecurityScreen from '../security';

const NEW_PHONE = '+905321234567';

beforeEach(() => {
  mockParams = {};
  mockUser = {
    displayName: 'Test',
    email: 't@b.com',
    membershipTier: 'free',
    phone: OLD_PHONE,
    isPhoneVerified: true,
  };
  mockRefreshUserData.mockReset();
  mockRefreshUserData.mockResolvedValue(null);
  updateProfile.mockReset();
  mockSendPhoneCode.mockClear();
  resetRouterMocks();
});

describe('phoneKey · aynı E.164 normalizasyonu', () => {
  it('biçim farkı aynı anahtarı verir; boş → ""', () => {
    expect(phoneKey('0532 123 45 67')).toBe(NEW_PHONE);
    expect(phoneKey('+90 532 123 45 67')).toBe(NEW_PHONE);
    expect(phoneKey(NEW_PHONE)).toBe(NEW_PHONE);
    expect(phoneKey(null)).toBe('');
  });
  it('çözülemeyen eski kayıt boşluksuz ham hâliyle kalır', () => {
    expect(phoneKey('+49 30 1234567')).toBe('+49301234567');
  });
});

describe('phoneToSend', () => {
  it('alana dokunulmadı → gönderilmez (undefined)', () => {
    expect(phoneToSend(OLD_PHONE, '555 111 22 33', '+90')).toBeUndefined();
  });
  it('aynı numara başka biçimde yazıldı → gönderilmez', () => {
    expect(phoneToSend(OLD_PHONE, '0555 111 22 33', '+90')).toBeUndefined();
  });
  it('E.164 olmayan eski kayıt, değişmeden → gönderilmez (değişti sayılmaz)', () => {
    expect(phoneToSend('05321234567', '532 123 45 67', '+90')).toBeUndefined();
    expect(phoneToSend('0532 123 45 67', '0532 123 45 67', '+90')).toBeUndefined();
  });
  it('alan boşaltıldı → kayıtlı numara varsa "" (sil), yoksa gönderilmez', () => {
    expect(phoneToSend(OLD_PHONE, '', '+90')).toBe('');
    expect(phoneToSend(OLD_PHONE, '   ', '+90')).toBe('');
    expect(phoneToSend(null, '', '+90')).toBeUndefined();
  });
  it('yeni numara → E.164; çözülemeyen → null', () => {
    expect(phoneToSend(OLD_PHONE, '0532 123 45 67', '+90')).toBe(NEW_PHONE);
    expect(phoneToSend(null, '532 123 45 67', '+90')).toBe(NEW_PHONE);
    expect(phoneToSend(OLD_PHONE, '05321234567890', '+90')).toBeNull();
  });
});

describe('resolvePhoneOutcome · tazelenen kullanıcının telefonuyla', () => {
  it('gönderilmedi → unchanged', () => {
    expect(resolvePhoneOutcome(undefined, OLD_PHONE)).toEqual({ outcome: 'unchanged' });
  });
  it('kayıtlı telefon gönderilenle aynı (biçim farkı önemsiz) → verify', () => {
    expect(resolvePhoneOutcome(NEW_PHONE, NEW_PHONE)).toEqual({ outcome: 'verify', phone: NEW_PHONE });
    expect(resolvePhoneOutcome(NEW_PHONE, '+90 532 123 45 67')).toEqual({
      outcome: 'verify',
      phone: NEW_PHONE,
    });
  });
  it('silme: kayıtlı telefon boş → removed, hâlâ duruyor → notRemoved', () => {
    expect(resolvePhoneOutcome('', null)).toEqual({ outcome: 'removed' });
    expect(resolvePhoneOutcome('', '')).toEqual({ outcome: 'removed' });
    expect(resolvePhoneOutcome('', OLD_PHONE)).toEqual({ outcome: 'notRemoved' });
  });
  it('kayıtlı telefon farklı / yok → notSaved', () => {
    expect(resolvePhoneOutcome(NEW_PHONE, OLD_PHONE)).toEqual({ outcome: 'notSaved', phone: NEW_PHONE });
    expect(resolvePhoneOutcome(NEW_PHONE, null)).toEqual({ outcome: 'notSaved', phone: NEW_PHONE });
  });
});

describe('edit-profile · telefon değişimi sonrası', () => {
  const saveWithPhone = (phone: string) => {
    renderWithProviders(<EditProfileScreen />);
    fireEvent.changeText(screen.getByTestId('profile-phone-input'), phone);
    fireEvent.press(screen.getByText('product.saveChanges'));
  };

  it('numara kaydedildi → doğrulama uyarısı, "Şimdi doğrula" güvenlik ekranına götürür', async () => {
    updateProfile.mockResolvedValue({ data: { phone: NEW_PHONE, isPhoneVerified: false } });
    saveWithPhone('0532 123 45 67');

    await waitFor(() => expect(appAlert).toHaveBeenCalled());
    const [title, body, buttons] = (appAlert as jest.Mock).mock.calls[0]!;
    expect(title).toBe('security.phoneSavedVerifyTitle');
    expect(body).toBe('security.phoneSavedVerifyBody');
    expect(mockRefreshUserData).toHaveBeenCalled();
    expect(screen.queryByText('profile.profileUpdated')).toBeNull();

    buttons.find((b: any) => b.text === 'security.verifyNow').onPress();
    expect(pushMock).toHaveBeenCalledWith({
      pathname: '/settings/security',
      params: { verifyPhone: NEW_PHONE },
    });
  });

  it('numara başka hesapta doğrulanmamış (yanıtta eski numara) → başarı değil, açıklayıcı uyarı', async () => {
    updateProfile.mockResolvedValue({ data: { phone: OLD_PHONE, isPhoneVerified: true } });
    saveWithPhone('0532 123 45 67');

    await waitFor(() => expect(appAlert).toHaveBeenCalled());
    const [title, body] = (appAlert as jest.Mock).mock.calls[0]!;
    expect(title).toBe('security.phoneNotSavedTitle');
    expect(body).toBe('security.phoneNotSavedBody');
    expect(screen.queryByText('profile.profileUpdated')).toBeNull();
  });

  it('notSaved sonrası form kayıtlı numaraya döner; sonraki ilgisiz kayıt uyarıyı tekrar tetiklemez', async () => {
    updateProfile.mockResolvedValue({ data: { phone: OLD_PHONE } });
    mockRefreshUserData.mockResolvedValue({ phone: OLD_PHONE, isPhoneVerified: true });
    saveWithPhone('0532 123 45 67');

    await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
    expect((appAlert as jest.Mock).mock.calls[0]![0]).toBe('security.phoneNotSavedTitle');
    await waitFor(() =>
      expect(screen.getByTestId('profile-phone-input').props.value).toBe('555 111 22 33'),
    );

    // İlgisiz ikinci kayıt (bio): numara gönderilmez, yeni uyarı yok.
    fireEvent.changeText(screen.getByPlaceholderText('mobile.bioPlaceholder'), 'merhaba');
    fireEvent.press(screen.getByText('product.saveChanges'));
    expect(await screen.findByText('profile.profileUpdated')).toBeTruthy();
    expect(updateProfile).toHaveBeenCalledTimes(2);
    expect(updateProfile.mock.calls[1]![0]).not.toHaveProperty('phone');
    expect(appAlert).toHaveBeenCalledTimes(1);
  });

  it('notRemoved sonrası boşaltılan alan kayıtlı numaraya döner', async () => {
    updateProfile.mockResolvedValue({ data: { phone: OLD_PHONE } });
    mockRefreshUserData.mockResolvedValue({ phone: OLD_PHONE });
    saveWithPhone('');

    expect(await screen.findByText('security.phoneNotRemoved')).toBeTruthy();
    expect(screen.getByTestId('profile-phone-input').props.value).toBe('555 111 22 33');
  });

  it('sonuç TAZELENEN kullanıcıyla belirlenir — yanıt şekli/biçimi yanıltmaz', async () => {
    // Yanıtta telefon yok (ör. farklı bir zarf) ama /users/me yeni numarayı
    // boşluklu biçimde döndürüyor: kaydedildi sayılmalı, "notSaved" DEĞİL.
    updateProfile.mockResolvedValue({ data: { user: { phone: NEW_PHONE } } });
    mockRefreshUserData.mockResolvedValue({ phone: '+90 532 123 45 67', isPhoneVerified: false });
    saveWithPhone('0532 123 45 67');

    await waitFor(() => expect(appAlert).toHaveBeenCalled());
    expect((appAlert as jest.Mock).mock.calls[0]![0]).toBe('security.phoneSavedVerifyTitle');
  });

  it('tazelenen kullanıcıda eski numara → notSaved (yanıtta yeni numara olsa bile)', async () => {
    updateProfile.mockResolvedValue({ data: { phone: NEW_PHONE } });
    mockRefreshUserData.mockResolvedValue({ phone: OLD_PHONE, isPhoneVerified: true });
    saveWithPhone('0532 123 45 67');

    await waitFor(() => expect(appAlert).toHaveBeenCalled());
    expect((appAlert as jest.Mock).mock.calls[0]![0]).toBe('security.phoneNotSavedTitle');
  });

  it('numara değişmedi → telefon payload\'a girmez, "Profil güncellendi", uyarı yok', async () => {
    updateProfile.mockResolvedValue({ data: { phone: OLD_PHONE } });
    renderWithProviders(<EditProfileScreen />);
    fireEvent.press(screen.getByText('product.saveChanges'));

    expect(await screen.findByText('profile.profileUpdated')).toBeTruthy();
    expect(updateProfile.mock.calls[0]![0]).not.toHaveProperty('phone');
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('alan boşaltılınca numara SİLİNİR: payload phone "" → "telefon kaldırıldı"', async () => {
    updateProfile.mockResolvedValue({ data: { phone: null, isPhoneVerified: false } });
    mockRefreshUserData.mockResolvedValue({ phone: undefined, isPhoneVerified: false });
    saveWithPhone('');

    expect(await screen.findByText('security.phoneRemoved')).toBeTruthy();
    expect(updateProfile.mock.calls[0]![0]).toMatchObject({ phone: '' });
    expect(screen.queryByText('profile.profileUpdated')).toBeNull();
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('silme sonrası tazelenen kullanıcıda numara hâlâ duruyorsa başarı DEĞİL', async () => {
    updateProfile.mockResolvedValue({ data: { phone: OLD_PHONE } });
    mockRefreshUserData.mockResolvedValue({ phone: OLD_PHONE });
    saveWithPhone('');

    expect(await screen.findByText('security.phoneNotRemoved')).toBeTruthy();
    expect(screen.queryByText('security.phoneRemoved')).toBeNull();
    expect(screen.queryByText('profile.profileUpdated')).toBeNull();
  });

  it('E.164 olmayan eski kayıtlı numara değişmeden kaydedilince "değişti" sayılmaz', async () => {
    mockUser = { ...mockUser, phone: '05321234567' };
    updateProfile.mockResolvedValue({ data: { phone: '05321234567' } });
    renderWithProviders(<EditProfileScreen />);
    fireEvent.press(screen.getByText('product.saveChanges'));

    expect(await screen.findByText('profile.profileUpdated')).toBeTruthy();
    expect(updateProfile.mock.calls[0]![0]).not.toHaveProperty('phone');
    expect(appAlert).not.toHaveBeenCalled();
  });
});

describe('security · ?verifyPhone= ile açılış', () => {
  it('pencere açılır ve kod o numaraya BİR kez gönderilir', async () => {
    mockParams = { verifyPhone: NEW_PHONE };
    renderWithProviders(<SecurityScreen />);

    await waitFor(() => expect(mockSendPhoneCode).toHaveBeenCalledWith(NEW_PHONE));
    expect(await screen.findByTestId('phone-code-input')).toBeTruthy();
    expect(mockSendPhoneCode).toHaveBeenCalledTimes(1);
  });

  it('parametre yoksa kendiliğinden kod gönderilmez', async () => {
    renderWithProviders(<SecurityScreen />);
    expect(await screen.findByText('security.verified')).toBeTruthy();
    expect(mockSendPhoneCode).not.toHaveBeenCalled();
  });
});
