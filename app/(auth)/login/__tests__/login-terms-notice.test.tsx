/**
 * Apple Guideline 1.2: kullanım koşulları kayıttan VEYA GİRİŞTEN önce
 * gösterilmeli. "Apple/Google ile devam et" ilk kullanımda hesap açıyor ve
 * kayıt ekranındaki onay kutusundan hiç geçmiyor — koşullar giriş kartında
 * da görünür ve tıklanabilir olmalı.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('@/services/googleSignin', () => ({ isGoogleConfigured: () => true }));

import { LoginCard } from '../_components/LoginCard';

function Harness() {
  const form = useForm({ defaultValues: { email: '', password: '', twoFactorCode: '' } });
  const f = {
    form,
    unverifiedEmail: null,
    setUnverifiedEmail: jest.fn(),
    resendVerificationMutation: { isPending: false, mutate: jest.fn() },
    loginMutation: { isPending: false },
    requires2FA: false,
    showPassword: false,
    setShowPassword: jest.fn(),
    onSubmit: jest.fn(),
    handleGoogle: jest.fn(),
    handleApple: jest.fn(),
    googleLoading: false,
    appleLoading: false,
    appleAvailable: true,
    continueAsGuest: jest.fn(),
  } as any;
  return <LoginCard f={f} />;
}

describe('LoginCard — koşullar girişten önce görünür', () => {
  beforeEach(() => mockPush.mockClear());

  it('koşul bildirimi sosyal giriş düğmeleriyle birlikte görünür', () => {
    const { getByText, getByTestId } = render(<Harness />);
    expect(getByTestId('login-apple-button')).toBeTruthy();
    expect(getByText('auth.loginTermsNotice')).toBeTruthy();
  });

  it('Kullanım Koşulları ve Gizlilik Politikası linkleri ilgili sayfalara gider', () => {
    const { getByTestId } = render(<Harness />);
    fireEvent.press(getByTestId('login-terms-link'));
    expect(mockPush).toHaveBeenCalledWith('/terms');
    fireEvent.press(getByTestId('login-privacy-link'));
    expect(mockPush).toHaveBeenCalledWith('/privacy');
  });
});
