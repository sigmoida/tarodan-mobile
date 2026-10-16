/**
 * Kayıt / e-posta doğrulama sonrası girişe bellek içi store ile taşınan adres (URL'de e-posta yok):
 * e-posta alanı önceden dolu gelir; store boşsa boş kalır.
 */
import React from 'react';
import { act, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
  Link: ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
    getProfile: jest.fn(),
    resendVerification: jest.fn(),
    checkEmail: jest.fn(),
  },
}));
jest.mock('@/services/googleSignin', () => ({
  signInWithGoogle: jest.fn(),
  isGoogleConfigured: () => false,
}));
jest.mock('@/services/appleSignin', () => ({
  signInWithApple: jest.fn(),
  isAppleAvailable: () => Promise.resolve(false),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: { login: () => void }) => unknown) => {
    const state = { login: jest.fn() };
    return sel ? sel(state) : state;
  },
}));

import { usePendingAuthEmailStore } from '@/stores/pendingAuthEmailStore';
import LoginScreen from '../index';

beforeEach(() => {
  usePendingAuthEmailStore.setState({ email: null });
});

it('store\'da e-posta varsa alan önceden dolu gelir', () => {
  usePendingAuthEmailStore.setState({ email: 'kayit@demo.com' });
  renderWithProviders(<LoginScreen />);
  expect(screen.getByTestId('login-email-input').props.value).toBe('kayit@demo.com');
});

it('store boşsa alan boştur', () => {
  renderWithProviders(<LoginScreen />);
  expect(screen.getByTestId('login-email-input').props.value).toBe('');
});

it('login zaten açıkken adres sonradan gelirse (dismissTo) alan dolar', async () => {
  renderWithProviders(<LoginScreen />);
  await act(async () => {
    usePendingAuthEmailStore.getState().setEmail('gec@demo.com');
  });
  expect(screen.getByTestId('login-email-input').props.value).toBe('gec@demo.com');
});
