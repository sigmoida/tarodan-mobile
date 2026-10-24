/**
 * Android while Google sign-in is off (and no Apple): no provider button is rendered, so the
 * login form must not show the "or" divider, and the no-password step must not point to a
 * provider button that is not there. The terms notice is provider-neutral everywhere.
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

describe('LoginForm — account without a password (provider-neutral, plan D5)', () => {
  beforeEach(() => mockIsGoogleConfigured.mockReset());

  it('without any provider button, only offers to set a password', () => {
    mockIsGoogleConfigured.mockReturnValue(false);
    const { getByTestId, queryByTestId, getByText, queryByText } = render(
      <Harness appleAvailable={false} step="noPassword" />,
    );
    expect(queryByTestId('login-google-button')).toBeNull();
    expect(queryByTestId('login-apple-button')).toBeNull();
    expect(queryByText('auth.noPasswordAccount')).toBeNull();
    expect(getByText('mobile.noPasswordAccountNoProvider')).toBeTruthy();
    expect(getByTestId('login-set-password-button')).toBeTruthy();
  });

  it('with Google, offers it with the neutral notice', () => {
    mockIsGoogleConfigured.mockReturnValue(true);
    const { getByTestId, getByText, queryByTestId } = render(<Harness appleAvailable={false} step="noPassword" />);
    expect(getByTestId('login-google-button')).toBeTruthy();
    expect(queryByTestId('login-apple-button')).toBeNull();
    expect(getByText('auth.noPasswordAccount')).toBeTruthy();
  });

  it('an Apple-only account on iOS (Google off): Apple shows, the notice names no provider', () => {
    mockIsGoogleConfigured.mockReturnValue(false);
    const { getByTestId, getByText, queryByTestId } = render(<Harness appleAvailable step="noPassword" />);
    expect(getByTestId('login-apple-button')).toBeTruthy();
    expect(queryByTestId('login-google-button')).toBeNull();
    expect(getByText('auth.noPasswordAccount')).toBeTruthy();
  });

  it('on iOS with both providers, both buttons show (web shows both too)', () => {
    mockIsGoogleConfigured.mockReturnValue(true);
    const { getByTestId } = render(<Harness appleAvailable step="noPassword" />);
    expect(getByTestId('login-google-button')).toBeTruthy();
    expect(getByTestId('login-apple-button')).toBeTruthy();
    expect(getByTestId('login-no-password-notice')).toBeTruthy();
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
