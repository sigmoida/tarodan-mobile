/**
 * Telefon doğrulama — kayıtlı numara saklı görüntüde YOK (`@/stores/userSnapshot`). Soğuk / yavaş
 * açılışta alan boş tohumlanıyordu. Sözleşme (`useFullProfile`): parametre yoksa tam profil
 * gelene kadar alan gösterilmez, gelince numara bir kez ondan kurulur; `?verifyPhone=` varsa
 * kapı yok (numara parametreden, profil çekilmez).
 */
import React from 'react';
import { act, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

const mockRefreshUserData = jest.fn();
jest.mock('@/stores/authStore', () => {
  const { create } = jest.requireActual('zustand');
  return {
    useAuthStore: create(() => ({
      user: null,
      isAuthenticated: true,
      profileValidated: false,
      refreshUserData: () => mockRefreshUserData(),
    })),
  };
});

const mockSendPhoneCode = jest.fn(() => Promise.resolve({ data: {} }));
jest.mock('@/lib/api', () => ({
  authApi: { sendPhoneCode: () => mockSendPhoneCode(), verifyPhone: jest.fn() },
}));

import { useAuthStore, type User } from '@/stores/authStore';
import PhoneVerificationScreen from '../phone';

const snapshotUser = { id: 'u1', isPhoneVerified: false } as unknown as User;

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  mockParams = {};
  useAuthStore.setState({ user: snapshotUser, isAuthenticated: true, profileValidated: false });
});

it('kayıtlı numara tam profil gelince alanı doldurur', async () => {
  let release!: () => void;
  mockRefreshUserData.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => {
          const full: User = { ...snapshotUser, phone: '+905551112233' };
          useAuthStore.setState({ user: full, profileValidated: true });
          resolve(full);
        };
      }),
  );

  renderWithProviders(<PhoneVerificationScreen />);

  await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalledTimes(1));
  expect(screen.queryByTestId('phone-input')).toBeNull();

  await act(async () => release());

  expect((await screen.findByTestId('phone-input')).props.value).toBe('555 111 22 33');
});

it('?verifyPhone= ile açılışta profil beklenmez', async () => {
  mockParams = { verifyPhone: '+905551112233' };

  renderWithProviders(<PhoneVerificationScreen />);

  expect(await screen.findByTestId('phone-code-input')).toBeTruthy();
  expect(mockRefreshUserData).not.toHaveBeenCalled();
});
