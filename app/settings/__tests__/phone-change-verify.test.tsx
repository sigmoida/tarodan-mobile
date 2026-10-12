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
import { resolvePhoneOutcome } from '../edit-profile/_lib/phoneOutcome';

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

const mockRefreshUserData = jest.fn(() => Promise.resolve());
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      isAuthenticated: true,
      logout: jest.fn(),
      user: {
        displayName: 'Test',
        email: 't@b.com',
        membershipTier: 'free',
        phone: '+905551112233',
        isPhoneVerified: true,
      },
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
  updateProfile.mockReset();
  mockSendPhoneCode.mockClear();
  mockRefreshUserData.mockClear();
  resetRouterMocks();
});

describe('resolvePhoneOutcome', () => {
  it('numara gönderilmedi / değişmedi → unchanged', () => {
    expect(resolvePhoneOutcome('+905551112233', undefined, '+905551112233')).toBe('unchanged');
    expect(resolvePhoneOutcome('+905551112233', '+905551112233', '+905551112233')).toBe('unchanged');
  });
  it('yeni numara yanıtta aynen → verify', () => {
    expect(resolvePhoneOutcome('+905551112233', NEW_PHONE, NEW_PHONE)).toBe('verify');
    expect(resolvePhoneOutcome(null, NEW_PHONE, NEW_PHONE)).toBe('verify');
  });
  it('yeni numara yanıtta yok/farklı → notSaved', () => {
    expect(resolvePhoneOutcome('+905551112233', NEW_PHONE, '+905551112233')).toBe('notSaved');
    expect(resolvePhoneOutcome(undefined, NEW_PHONE, null)).toBe('notSaved');
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
    updateProfile.mockResolvedValue({ data: { phone: '+905551112233', isPhoneVerified: true } });
    saveWithPhone('0532 123 45 67');

    await waitFor(() => expect(appAlert).toHaveBeenCalled());
    const [title, body] = (appAlert as jest.Mock).mock.calls[0]!;
    expect(title).toBe('security.phoneNotSavedTitle');
    expect(body).toBe('security.phoneNotSavedBody');
    expect(screen.queryByText('profile.profileUpdated')).toBeNull();
  });

  it('numara değişmedi → eskisi gibi "Profil güncellendi", uyarı yok', async () => {
    updateProfile.mockResolvedValue({ data: { phone: '+905551112233' } });
    renderWithProviders(<EditProfileScreen />);
    fireEvent.press(screen.getByText('product.saveChanges'));

    expect(await screen.findByText('profile.profileUpdated')).toBeTruthy();
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
