/**
 * Android while Google sign-in is off (and no Apple): no provider button is rendered, so the
 * login form must not show the "or" divider or the Apple/Google terms copy either.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
const mockIsGoogleConfigured = jest.fn();
jest.mock('@/services/googleSignin', () => ({ isGoogleConfigured: () => mockIsGoogleConfigured() }));

import { LoginForm } from '../_components/LoginForm';
import { SocialButtons } from '@/components/auth/SocialButtons';

function Harness({ appleAvailable }: { appleAvailable: boolean }) {
  const form = useForm({ defaultValues: { email: '', password: '', twoFactorCode: '' } });
  const f = {
    form,
    step: 'email',
    email: '',
    notRegistered: false,
    identify: jest.fn(),
    identifying: false,
    social: { googleLoading: false, appleLoading: false, appleAvailable, handleGoogle: jest.fn(), handleApple: jest.fn() },
    unverifiedEmail: null,
    setUnverifiedEmail: jest.fn(),
    resendVerificationMutation: { isPending: false, mutate: jest.fn() },
    loginMutation: { isPending: false },
    requires2FA: false,
    showPassword: false,
    setShowPassword: jest.fn(),
    onSubmit: jest.fn(),
    continueAsGuest: jest.fn(),
  };
  return <LoginForm f={f as never} />;
}

describe('LoginForm — no provider button', () => {
  beforeEach(() => mockIsGoogleConfigured.mockReset());

  it('hides the divider and shows the neutral terms notice', () => {
    mockIsGoogleConfigured.mockReturnValue(false);
    const { queryByText, queryByTestId, getByText } = render(<Harness appleAvailable={false} />);
    expect(queryByTestId('login-google-button')).toBeNull();
    expect(queryByTestId('login-apple-button')).toBeNull();
    expect(queryByText('common.or')).toBeNull();
    expect(queryByText('auth.loginTermsNotice')).toBeNull();
    expect(getByText('auth.loginTermsNoticeNoSocial')).toBeTruthy();
    expect(queryByTestId('login-email-input')).toBeTruthy();
  });

  it('keeps the divider and the Apple/Google notice when only Apple shows', () => {
    mockIsGoogleConfigured.mockReturnValue(false);
    const { getByText, getByTestId, queryByText } = render(<Harness appleAvailable />);
    expect(getByTestId('login-apple-button')).toBeTruthy();
    expect(getByText('common.or')).toBeTruthy();
    expect(getByText('auth.loginTermsNotice')).toBeTruthy();
    expect(queryByText('auth.loginTermsNoticeNoSocial')).toBeNull();
  });

  it('keeps the divider and the notice when only Google shows', () => {
    mockIsGoogleConfigured.mockReturnValue(true);
    const { getByText, getByTestId } = render(<Harness appleAvailable={false} />);
    expect(getByTestId('login-google-button')).toBeTruthy();
    expect(getByText('common.or')).toBeTruthy();
    expect(getByText('auth.loginTermsNotice')).toBeTruthy();
  });
});

describe('SocialButtons — no provider (register screen)', () => {
  it('renders nothing, so the register form has no orphan social block', () => {
    mockIsGoogleConfigured.mockReturnValue(false);
    const social = { googleLoading: false, appleLoading: false, appleAvailable: false, handleGoogle: jest.fn(), handleApple: jest.fn() };
    const { toJSON } = render(<SocialButtons social={social} testIDPrefix="register" />);
    expect(toJSON()).toBeNull();
  });
});
