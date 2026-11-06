/**
 * The overlap behind the iOS black screen, with the real form, the real gate and the real library:
 * the identity gate opening over the card form must not reach native prevent twice, and the lock
 * must hold from card entry through the 3DS WebView until the last of them closes.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAYTR_ACTION } from '@/lib/payment/paytrDirectForm';
import type { LegalIdentityStatus } from '@/lib/shared/legalIdentity';

const mockNative = {
  preventScreenCapture: jest.fn(() => Promise.resolve()),
  allowScreenCapture: jest.fn(() => Promise.resolve()),
  enableAppSwitcherProtection: jest.fn(() => Promise.resolve()),
  disableAppSwitcherProtection: jest.fn(() => Promise.resolve()),
};
jest.mock('expo-screen-capture/build/ExpoScreenCapture', () => ({ __esModule: true, default: mockNative }));

jest.mock('@/lib/api', () => ({
  paymentsApi: {
    directForm: jest.fn(),
    verify: jest.fn(() => Promise.resolve({})),
    getStatusLight: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
    getStatusLightGuest: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
  },
  membershipApi: { listCards: jest.fn(() => Promise.resolve({ data: [] })) },
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));
import { paymentsApi } from '@/lib/api';

jest.mock('react-native-webview', () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { createElement } = require('react');
  const { View } = require('react-native');
  /* eslint-enable @typescript-eslint/no-var-requires */
  return {
    WebView: () => createElement(View, { testID: 'paytr-webview' }),
    WebViewNavigation: {},
  };
});

import { __resetScreenCaptureProtection } from '@/lib/security/screenCapture';
import CardPaymentForm from '../CardPaymentForm';
import { LegalIdentityGate } from '../required-steps/LegalIdentityGate';

const flushRelease = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const STATUS: LegalIdentityStatus = {
  required: true,
  missing: ['nationalId'],
  legalFirstName: null,
  legalLastName: null,
  nationalIdMasked: null,
  suggestedNationalId: null,
};

const form = () => <CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={jest.fn()} />;

beforeEach(() => {
  __resetScreenCaptureProtection();
  jest.clearAllMocks();
});

it('the identity gate over the card form locks native once and releases after both close', async () => {
  const card = renderWithProviders(form());
  expect(mockNative.preventScreenCapture).toHaveBeenCalledTimes(1);

  const gate = renderWithProviders(<LegalIdentityGate status={STATUS} onCancel={jest.fn()} />);
  expect(mockNative.preventScreenCapture).toHaveBeenCalledTimes(1);

  gate.unmount();
  await flushRelease();
  expect(mockNative.allowScreenCapture).not.toHaveBeenCalled();

  card.unmount();
  await flushRelease();
  expect(mockNative.allowScreenCapture).toHaveBeenCalledTimes(1);
  expect(mockNative.preventScreenCapture).toHaveBeenCalledTimes(1);
});

it('the lock holds from card entry through the 3DS WebView', async () => {
  (paymentsApi.directForm as jest.Mock).mockResolvedValue({
    data: {
      paymentId: 'pay-9',
      action: PAYTR_ACTION,
      method: 'POST',
      fields: [{ name: 'merchant_id', value: '12345' }],
    },
  });
  renderWithProviders(form());
  fireEvent.changeText(screen.getByTestId('card-holder'), 'Ahmet Yilmaz');
  fireEvent.changeText(screen.getByTestId('card-number'), '4111111111111111');
  fireEvent.changeText(screen.getByTestId('card-exp-month'), '07');
  fireEvent.changeText(screen.getByTestId('card-exp-year'), '28');
  fireEvent.changeText(screen.getByTestId('card-cvc'), '123');
  fireEvent.press(screen.getByTestId('payment-distance-sales-checkbox'));
  fireEvent.press(screen.getByTestId('card-submit'));

  await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());
  await flushRelease();
  expect(mockNative.preventScreenCapture).toHaveBeenCalledTimes(1);
  expect(mockNative.allowScreenCapture).not.toHaveBeenCalled();
});
