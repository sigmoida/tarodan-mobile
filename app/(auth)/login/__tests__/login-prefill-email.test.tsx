/**
 * Kayıt / e-posta doğrulama sonrası girişe `?email=` ile taşınan adres: e-posta alanı
 * önceden dolu gelir; param yoksa boş kalır.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, unknown> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
  Link: ({ children }: any) => children,
  useLocalSearchParams: () => mockParams,
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
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { login: jest.fn() };
    return sel ? sel(state) : state;
  },
}));

import LoginScreen from '../index';

beforeEach(() => {
  mockParams = {};
});

it('`?email=` varsa e-posta alanı önceden dolu gelir', () => {
  mockParams = { email: ' kayit@demo.com ' };
  renderWithProviders(<LoginScreen />);
  expect(screen.getByTestId('login-email-input').props.value).toBe('kayit@demo.com');
});

it('param yoksa e-posta alanı boştur', () => {
  renderWithProviders(<LoginScreen />);
  expect(screen.getByTestId('login-email-input').props.value).toBe('');
});
