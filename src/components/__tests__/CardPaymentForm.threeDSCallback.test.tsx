/**
 * 3DS dönüş tespiti (para akışı): WebView'in vardığı adres yalnız KENDİ dönüş adresimizle
 * (katı köken + yol) eşleşirse sayılır; başarı adresi bile tek başına başarı DEĞİLDİR —
 * sunucudaki ödeme durumu "ödendi" olmadan `onSuccess` çağrılmaz.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAYTR_ACTION } from '@/lib/payment/paytrDirectForm';
import { threeDSCallbackResult } from '@/lib/payment/threeDSCallback';

const mockStatus = jest.fn();
jest.mock('@/lib/api', () => ({
  paymentsApi: {
    directForm: jest.fn(() =>
      Promise.resolve({
        data: { paymentId: 'pay-1', action: 'https://www.paytr.com/odeme', fields: [{ name: 'merchant_id', value: '1' }] },
      }),
    ),
    getStatusLight: (...a: unknown[]) => mockStatus(...a),
    verify: jest.fn(() => Promise.resolve({ data: {} })),
  },
  membershipApi: { listCards: jest.fn(() => Promise.resolve({ data: [] })) },
}));

let mockWebViewNav: ((nav: { url: string }) => void) | undefined;
let mockShouldStart: ((req: { url: string }) => boolean) | undefined;
jest.mock('react-native-webview', () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const React = require('react');
  const { View } = require('react-native');
  /* eslint-enable @typescript-eslint/no-var-requires */
  return {
    WebView: (props: {
      onNavigationStateChange?: (nav: { url: string }) => void;
      onShouldStartLoadWithRequest?: (req: { url: string }) => boolean;
    }) => {
      mockWebViewNav = props.onNavigationStateChange;
      mockShouldStart = props.onShouldStartLoadWithRequest;
      return React.createElement(View, { testID: 'paytr-webview' });
    },
    WebViewNavigation: {},
  };
});

import { act } from '@testing-library/react-native';
import { appAlert } from '@/ui';
import { __resetVerifyPacer, PAYMENT_POLL_DURATION_MS } from '@/lib/payment/verifyPacer';
import CardPaymentForm from '../CardPaymentForm';

const PAY = 'pay-1';
const pending = { data: { status: 'pending' } };
const completed = { data: { status: 'completed' } };

async function openThreeDS(onSuccess = jest.fn(), onFail = jest.fn(), onUncertain = jest.fn()) {
  renderWithProviders(
    <CardPaymentForm
      target={{ orderId: 'o-1' }}
      paymentId={PAY}
      onSuccess={onSuccess}
      onFail={onFail}
      onUncertain={onUncertain}
    />,
  );
  fireEvent.changeText(screen.getByTestId('card-holder'), 'Ahmet Yılmaz');
  fireEvent.changeText(screen.getByTestId('card-number'), '4111111111111111');
  fireEvent.changeText(screen.getByTestId('card-exp-month'), '07');
  fireEvent.changeText(screen.getByTestId('card-exp-year'), '28');
  fireEvent.changeText(screen.getByTestId('card-cvc'), '123');
  fireEvent.press(screen.getByTestId('payment-distance-sales-checkbox'));
  fireEvent.press(screen.getByTestId('card-submit'));
  await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());
  mockWebViewNav?.({ url: PAYTR_ACTION });
  return { onSuccess, onFail, onUncertain };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWebViewNav = undefined;
  mockShouldStart = undefined;
  __resetVerifyPacer();
  mockStatus.mockResolvedValue(pending);
});

describe('threeDSCallbackResult (katı köken + yol)', () => {
  it.each([
    ['https://tarodan.com.tr/payment/success', 'success'],
    ['https://tarodan.com.tr/payment/success?orderId=o-1', 'success'],
    ['https://www.tarodan.com.tr/payment/success/', 'success'],
    ['https://tarodan.com.tr/en/payment/success', 'success'],
    ['https://tarodan.com.tr/payment/fail', 'fail'],
    ['https://tarodan.com.tr/payment/failure', 'fail'],
  ])('%s → %s', (url, expected) => {
    expect(threeDSCallbackResult(url)).toBe(expected);
  });

  it.each([
    'https://evil.example/payment/success',
    'https://tarodan.com.tr.evil.example/payment/success',
    'https://tarodan.com.tr@evil.example/payment/success',
    'https://evil.example/?next=https://tarodan.com.tr/payment/success',
    'https://evil.example/x#https://tarodan.com.tr/payment/success',
    'http://tarodan.com.tr/payment/success',
    'https://tarodan.com.tr:8443/payment/success',
    'https://tarodan.com.tr/payment/successful',
    'https://tarodan.com.tr/x/payment/success',
    'https://tarodan.com.tr/PAYMENT/SUCCESS',
    'https://tarodan.com.tr\\@evil.example/payment/success',
    'javascript:location="https://tarodan.com.tr/payment/success"',
    '',
  ])('eşleşmez: %s', (url) => {
    expect(threeDSCallbackResult(url)).toBeNull();
  });

  it('production host kümesinde staging dönüş adresi sayılmaz', () => {
    const prodHosts = new Set(['tarodan.com.tr', 'www.tarodan.com.tr']);
    expect(threeDSCallbackResult('https://staging.tarodan.com.tr/payment/success', prodHosts)).toBeNull();
    expect(threeDSCallbackResult('https://tarodan.com.tr/payment/success', prodHosts)).toBe('success');
  });
});

describe('CardPaymentForm 3DS dönüşü', () => {
  it('sahte "başarı" yönlendirmesi (yabancı host / alt dize) başarı göstermez, durum sorgusu tetiklemez', async () => {
    const { onSuccess, onFail } = await openThreeDS();
    for (const url of [
      'https://evil.example/payment/success',
      'https://evil.example/?r=/payment/success',
      'https://tarodan.com.tr.evil.example/payment/success',
    ]) {
      mockWebViewNav?.({ url });
    }
    await new Promise((r) => setTimeout(r, 0));
    expect(mockStatus).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onFail).not.toHaveBeenCalled();
  });

  it('başarı adresi WebView\'de yüklenmez (onShouldStartLoadWithRequest false), diğerleri yüklenir', async () => {
    await openThreeDS();
    expect(mockShouldStart?.({ url: 'https://acs.examplebank.com.tr/3ds' })).toBe(true);
    expect(mockShouldStart?.({ url: 'https://evil.example/payment/success' })).toBe(true);
    expect(mockShouldStart?.({ url: 'https://tarodan.com.tr/payment/success' })).toBe(false);
  });

  it('gerçek dönüş adresi + sunucu "bekliyor" → WebView kapanır, doğrulanıyor; sonra "ödendi" → başarı', async () => {
    const { onSuccess } = await openThreeDS();
    act(() => mockWebViewNav?.({ url: 'https://tarodan.com.tr/payment/success?orderId=o-1' }));
    await waitFor(() => expect(mockStatus).toHaveBeenCalledWith(PAY));
    // Web sitemizin başarı sayfası uygulamada çizilmez; ekran doğrulama durumunda.
    expect(screen.queryByTestId('paytr-webview')).toBeNull();
    expect(screen.getByTestId('payment-verifying-note')).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();

    mockStatus.mockResolvedValue(completed);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(PAY), { timeout: 8000 });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  }, 15000);

  it('sunucu süre boyunca "ödendi" demezse: başarı YOK, kapatılamayan "belirsiz" uyarısı → onUncertain', async () => {
    jest.useFakeTimers();
    try {
      const { onSuccess, onUncertain } = await openThreeDS();
      act(() => mockWebViewNav?.({ url: 'https://tarodan.com.tr/payment/success' }));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(PAYMENT_POLL_DURATION_MS + 10_000);
      });
      expect(onSuccess).not.toHaveBeenCalled();
      const call = (appAlert as jest.Mock).mock.calls.find(([, , buttons]) => Array.isArray(buttons));
      expect(call).toBeTruthy();
      expect(call![3]).toEqual({ cancelable: false });
      expect(onUncertain).not.toHaveBeenCalled();
      act(() => call![2][0].onPress());
      expect(onUncertain).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('gerçek dönüş adresi + sunucu "ödendi" → başarı (yoklamayı beklemeden)', async () => {
    mockStatus.mockResolvedValue(completed);
    const { onSuccess } = await openThreeDS();
    mockWebViewNav?.({ url: 'https://tarodan.com.tr/payment/success' });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(PAY));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('gerçek başarısızlık adresi → onFail; yabancı host\'taki "fail" yok sayılır', async () => {
    const { onFail } = await openThreeDS();
    mockWebViewNav?.({ url: 'https://evil.example/payment/fail' });
    expect(onFail).not.toHaveBeenCalled();
    mockWebViewNav?.({ url: 'https://tarodan.com.tr/payment/fail' });
    expect(onFail).toHaveBeenCalledTimes(1);
  });
});
