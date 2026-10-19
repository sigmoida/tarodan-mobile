/**
 * Android while Google sign-in is off (and no Apple): no provider button is rendered, so the
 * login form must not show the "or" divider, and the Google-only step must not point to a
 * Google button that is not there. The terms notice is provider-neutral everywhere.
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

function Harness({ appleAvailable, step = 'email' }: { appleAvailable: boolean; step?: string }) {
  const form = useForm({ defaultValues: { email: '', password: '', twoFactorCode: '' } });
  const f = {
    form,
    step,
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

  it('hides the divider and keeps the neutral terms notice', () => {
    mockIsGoogleConfigured.mockReturnValue(false);
    const { queryByText, queryByTestId, getByText } = render(<Harness appleAvailable={false} />);
    expect(queryByTestId('login-google-button')).toBeNull();
    expect(queryByTestId('login-apple-button')).toBeNull();
    expect(queryByText('common.or')).toBeNull();
    expect(getByText('auth.loginTermsNotice')).toBeTruthy();
    expect(queryByTestId('login-email-input')).toBeTruthy();
  });

  it('keeps the divider and the notice when only Apple shows', () => {
    mockIsGoogleConfigured.mockReturnValue(false);
    const { getByText, getByTestId } = render(<Harness appleAvailable />);
    expect(getByTestId('login-apple-button')).toBeTruthy();
    expect(getByText('common.or')).toBeTruthy();
    expect(getByText('auth.loginTermsNotice')).toBeTruthy();
  });

  it('keeps the divider and the notice when only Google shows', () => {
    mockIsGoogleConfigured.mockReturnValue(true);
    const { getByText, getByTestId } = render(<Harness appleAvailable={false} />);
    expect(getByTestId('login-google-button')).toBeTruthy();
    expect(getByText('common.or')).toBeTruthy();
    expect(getByText('auth.loginTermsNotice')).toBeTruthy();
  });
});

describe('LoginForm — Google-only account step', () => {
  beforeEach(() => mockIsGoogleConfigured.mockReset());

  it('without a Google button, only offers to set a password', () => {
    mockIsGoogleConfigured.mockReturnValue(false);
    const { getByTestId, queryByTestId, getByText, queryByText } = render(
      <Harness appleAvailable step="googleOnly" />,
    );
    expect(queryByTestId('login-google-button')).toBeNull();
    expect(queryByTestId('login-apple-button')).toBeNull();
    expect(queryByText('auth.googleOnlyAccount')).toBeNull();
    expect(getByText('mobile.googleOnlyAccountNoGoogle')).toBeTruthy();
    expect(getByTestId('login-set-password-button')).toBeTruthy();
  });

  it('with the Google button, keeps the web notice', () => {
    mockIsGoogleConfigured.mockReturnValue(true);
    const { getByTestId, getByText } = render(<Harness appleAvailable step="googleOnly" />);
    expect(getByTestId('login-google-button')).toBeTruthy();
    expect(getByText('auth.googleOnlyAccount')).toBeTruthy();
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
