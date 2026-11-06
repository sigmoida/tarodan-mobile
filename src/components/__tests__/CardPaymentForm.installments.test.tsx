/**
 * CardPaymentForm + installment selector (ADR 0019, plan 6.2 / 6.3; A4 direct-form contract).
 *
 * Money pins: the pay button and the terms show the server's total of the chosen count; the
 * direct-form body carries `installment: { count, bin?, expectedTotal }` only for a count above 1,
 * with at most the first 8 card digits; a refusal (409 / 400) re-reads the options and asks the
 * buyer again, never pays a different amount silently.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAYTR_ACTION } from '@/lib/payment/paytrDirectForm';

jest.mock('@/lib/api', () => ({
  paymentsApi: {
    directForm: jest.fn(),
    directFormGuest: jest.fn(),
    installmentOptions: jest.fn(),
    installmentOptionsGuest: jest.fn(),
    verify: jest.fn(() => Promise.resolve({})),
    getStatusLight: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
    getStatusLightGuest: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
  },
  membershipApi: { listCards: jest.fn(() => Promise.resolve({ data: [] })) },
}));
jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));
jest.mock('react-native-webview', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { WebView: () => React.createElement(View, { testID: 'paytr-webview' }), WebViewNavigation: {} };
});
import { paymentsApi, membershipApi } from '@/lib/api';
import { appAlert as mockAlert } from '@/ui';
import CardPaymentForm from '../CardPaymentForm';

const optionsMock = paymentsApi.installmentOptions as jest.Mock;
const optionsGuestMock = paymentsApi.installmentOptionsGuest as jest.Mock;
const directFormMock = paymentsApi.directForm as jest.Mock;
const directFormGuestMock = paymentsApi.directFormGuest as jest.Mock;
const listCardsMock = membershipApi.listCards as jest.Mock;

const CARD = '4546711234567890';
const OTHER_CARD = '5400123412341234';

const SINGLE = { count: 1, totalAmount: 1000, feeAmount: 0, monthlyAmount: 1000 };
const TWO_FREE = { count: 2, totalAmount: 1000, feeAmount: 0, monthlyAmount: 500 };
const THREE = { count: 3, totalAmount: 1066.38, feeAmount: 66.38, monthlyAmount: 355.46 };
const ANSWER = {
  enabled: true,
  card: { bank: 'Test Bank', family: 'world', type: 'credit' },
  baseAmount: 1000,
  options: [SINGLE, TWO_FREE, THREE],
};

const signed = { paymentId: 'pay-1', action: PAYTR_ACTION, method: 'POST', fields: [{ name: 'merchant_id', value: '1' }] };

const conflict = (i18nKey: string, message = 'server says') => ({
  response: { status: 409, data: { statusCode: 409, i18nKey, message } },
});

function renderForm(over: Partial<React.ComponentProps<typeof CardPaymentForm>> = {}) {
  return renderWithProviders(
    <CardPaymentForm
      target={{ orderId: 'o-1' }}
      amount={1000}
      paymentId="pay-1"
      installmentsEnabled
      onSuccess={jest.fn()}
      {...over}
    />,
  );
}

function fillNewCard(number = CARD) {
  fireEvent.changeText(screen.getByTestId('card-holder'), 'Ahmet Yilmaz');
  fireEvent.changeText(screen.getByTestId('card-number'), number);
  fireEvent.changeText(screen.getByTestId('card-exp-month'), '07');
  fireEvent.changeText(screen.getByTestId('card-exp-year'), '28');
  fireEvent.changeText(screen.getByTestId('card-cvc'), '123');
}

function acceptAndPay() {
  fireEvent.press(screen.getByTestId('payment-distance-sales-checkbox'));
  fireEvent.press(screen.getByTestId('card-submit'));
}

const payTitle = () => screen.getByTestId('card-submit');

beforeEach(() => {
  jest.clearAllMocks();
  optionsMock.mockResolvedValue({ data: ANSWER });
  optionsGuestMock.mockResolvedValue({ data: ANSWER });
  directFormMock.mockResolvedValue({ data: signed });
  directFormGuestMock.mockResolvedValue({ data: signed });
  listCardsMock.mockResolvedValue({ data: [] });
});

it('switch off (or excluded payment): no selector, no options call, no installment field', async () => {
  renderForm({ installmentsEnabled: false });
  fillNewCard();
  expect(screen.queryByTestId('installment-options')).toBeNull();
  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalled());
  expect(optionsMock).not.toHaveBeenCalled();
  expect(directFormMock.mock.calls[0][0]).not.toHaveProperty('installment');
});

it('asks for the card number first, then loads the options of the first 8 digits only', async () => {
  renderForm();
  expect(screen.getByText('Taksit seçeneklerini görmek için kart numaranızı girin.')).toBeOnTheScreen();
  fireEvent.changeText(screen.getByTestId('card-number'), '4546711');
  expect(optionsMock).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByTestId('card-number'), CARD);

  expect(await screen.findByTestId('installment-option-3')).toBeOnTheScreen();
  expect(optionsMock).toHaveBeenCalledTimes(1);
  expect(optionsMock.mock.calls[0][0]).toEqual({ bin: '45467112', paymentId: 'pay-1' });
  expect(JSON.stringify(optionsMock.mock.calls[0][0])).not.toContain(CARD);

  expect(screen.getByText('Test Bank · World')).toBeOnTheScreen();
  expect(screen.getByText('Tek çekim')).toBeOnTheScreen();
  expect(screen.getByText('2 x 500,00 TL')).toBeOnTheScreen();
  expect(screen.getByText('Vade farksız')).toBeOnTheScreen();
  expect(screen.getByText('3 x 355,46 TL')).toBeOnTheScreen();
  expect(screen.getByText('Vade farkı 66,38 TL')).toBeOnTheScreen();
  expect(screen.getByText('Toplam 1.066,38 TL')).toBeOnTheScreen();
  // Single payment is preselected; the button shows the goods total.
  expect(screen.getByTestId('installment-option-1').props.accessibilityState).toEqual({ checked: true });
  expect(payTitle()).toHaveTextContent('1.000,00 TL Öde');
});

it('each option is a radio whose name holds count, monthly, total and fee', async () => {
  renderForm();
  fillNewCard();
  const three = await screen.findByTestId('installment-option-3');
  expect(three.props.accessibilityRole).toBe('radio');
  expect(three.props.accessibilityLabel).toBe('3 taksit, 3 x 355,46 TL, Toplam 1.066,38 TL, Vade farkı 66,38 TL');
  expect(screen.getByTestId('installment-option-2').props.accessibilityLabel).toBe(
    '2 taksit, 2 x 500,00 TL, Toplam 1.000,00 TL, Vade farksız',
  );
  fireEvent.press(three);
  expect(screen.getByTestId('installment-option-3').props.accessibilityState).toEqual({ checked: true });
  expect(screen.getByTestId('installment-option-1').props.accessibilityState).toEqual({ checked: false });
});

it('3 installments: the button and the terms show the charged total; the body carries count, BIN and total', async () => {
  renderForm();
  fillNewCard();
  fireEvent.press(await screen.findByTestId('installment-option-3'));

  expect(payTitle()).toHaveTextContent('1.066,38 TL Öde');
  expect(screen.getByTestId('installment-terms')).toHaveTextContent(
    '3 taksit: aylık 355,46 TL, vade farkı 66,38 TL, toplam 1.066,38 TL.',
  );

  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalled());
  const body = directFormMock.mock.calls[0][0];
  expect(body).toEqual({
    orderId: 'o-1',
    paymentId: 'pay-1',
    saveCard: false,
    distanceSalesAccepted: true,
    installment: { count: 3, bin: '45467112', expectedTotal: 1066.38 },
  });
  // PCI: no card number (no run of 9+ digits), no CVV / expiry in our API's body.
  expect(JSON.stringify(body)).not.toMatch(/\d{9,}/);
  expect(await screen.findByTestId('paytr-webview')).toBeOnTheScreen();
});

it('a zero-fee count is sent with the goods total', async () => {
  renderForm();
  fillNewCard();
  fireEvent.press(await screen.findByTestId('installment-option-2'));
  expect(payTitle()).toHaveTextContent('1.000,00 TL Öde');
  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalled());
  expect(directFormMock.mock.calls[0][0].installment).toEqual({ count: 2, bin: '45467112', expectedTotal: 1000 });
});

it('another card (first 8 digits change) resets the choice to the single payment', async () => {
  renderForm();
  fillNewCard();
  fireEvent.press(await screen.findByTestId('installment-option-3'));
  expect(payTitle()).toHaveTextContent('1.066,38 TL Öde');

  // Digits after the 8th do not change the card: the choice stays.
  fireEvent.changeText(screen.getByTestId('card-number'), '4546711299999999');
  expect(payTitle()).toHaveTextContent('1.066,38 TL Öde');

  fireEvent.changeText(screen.getByTestId('card-number'), OTHER_CARD);
  expect(payTitle()).toHaveTextContent('1.000,00 TL Öde');
  expect(screen.queryByTestId('installment-terms')).toBeNull();
  await waitFor(() => expect(optionsMock).toHaveBeenCalledTimes(2));
  expect(optionsMock.mock.calls[1][0]).toEqual({ bin: '54001234', paymentId: 'pay-1' });
  expect((await screen.findByTestId('installment-option-1')).props.accessibilityState).toEqual({ checked: true });
});

it.each([
  ['card_not_eligible', {}, 'Bu kartla yalnız tek çekim ödeme yapılabilir.'],
  ['not_offered_for_payment', {}, 'Bu ödeme için yalnız tek çekim kullanılabilir.'],
  ['below_minimum', { minAmount: 500 }, 'Taksit, 500,00 TL ve üzeri ödemelerde kullanılabilir.'],
  ['unavailable', {}, 'Taksit seçenekleri şu an gösterilemiyor. Tek çekim ile ödeyebilirsiniz.'],
])('reason %s: one-line note, single payment payable', async (reason, extra, text) => {
  optionsMock.mockResolvedValue({ data: { enabled: false, reason, baseAmount: 1000, options: [SINGLE], ...extra } });
  renderForm();
  fillNewCard();
  expect(await screen.findByText(text)).toBeOnTheScreen();
  expect(screen.queryByTestId('installment-option-1')).toBeNull();
  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalled());
  expect(directFormMock.mock.calls[0][0]).not.toHaveProperty('installment');
});

it('options call fails (429 / network): unavailable note, single payment payable', async () => {
  optionsMock.mockRejectedValue({ response: { status: 429, data: {} } });
  renderForm();
  fillNewCard();
  expect(await screen.findByTestId('installment-note')).toHaveTextContent(
    'Taksit seçenekleri şu an gösterilemiyor. Tek çekim ile ödeyebilirsiniz.',
  );
  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalled());
  expect(directFormMock.mock.calls[0][0]).not.toHaveProperty('installment');
});

it('switch turned off meanwhile (reason disabled): the selector disappears', async () => {
  optionsMock.mockResolvedValue({ data: { enabled: false, reason: 'disabled', baseAmount: 1000, options: [SINGLE] } });
  renderForm();
  fillNewCard();
  await waitFor(() => expect(optionsMock).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByTestId('installment-options')).toBeNull());
});

it('409 installmentPricingChanged: options are re-read, the buyer sees the new total and confirms again', async () => {
  const THREE_NEW = { ...THREE, totalAmount: 1070.1, feeAmount: 70.1, monthlyAmount: 356.7 };
  optionsMock
    .mockResolvedValueOnce({ data: ANSWER })
    .mockResolvedValue({ data: { ...ANSWER, options: [SINGLE, TWO_FREE, THREE_NEW] } });
  directFormMock.mockRejectedValueOnce(conflict('server.payment.installmentPricingChanged', 'Taksit tutarı güncellendi.'));
  renderForm();
  fillNewCard();
  fireEvent.press(await screen.findByTestId('installment-option-3'));
  acceptAndPay();

  await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('Taksit seçenekleri', 'Taksit tutarı güncellendi.'));
  await waitFor(() => expect(optionsMock).toHaveBeenCalledTimes(2));
  // The count stays chosen with its new price; nothing was paid meanwhile.
  await waitFor(() => expect(payTitle()).toHaveTextContent('1.070,10 TL Öde'));
  expect(screen.queryByTestId('paytr-webview')).toBeNull();

  fireEvent.press(screen.getByTestId('card-submit'));
  await waitFor(() => expect(directFormMock).toHaveBeenCalledTimes(2));
  expect(directFormMock.mock.calls[1][0].installment).toEqual({ count: 3, bin: '45467112', expectedTotal: 1070.1 });
});

it.each([
  ['server.payment.installmentUnavailable', 'Taksit şu an kullanılamıyor. Tek çekim ile devam edebilirsiniz.'],
  ['server.payment.installmentNotOffered', 'Seçtiğiniz taksit bu kart ve tutar için kullanılamıyor.'],
])('%s: back to the single payment, the next pay sends no installment', async (key, fallback) => {
  directFormMock.mockRejectedValueOnce(conflict(key, ''));
  renderForm();
  fillNewCard();
  fireEvent.press(await screen.findByTestId('installment-option-3'));
  acceptAndPay();

  await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('Taksit seçenekleri', fallback));
  await waitFor(() => expect(payTitle()).toHaveTextContent('1.000,00 TL Öde'));
  await waitFor(() => expect(optionsMock).toHaveBeenCalledTimes(2));
  await screen.findByTestId('installment-option-1');
  fireEvent.press(screen.getByTestId('card-submit'));
  await waitFor(() => expect(directFormMock).toHaveBeenCalledTimes(2));
  expect(directFormMock.mock.calls[1][0]).not.toHaveProperty('installment');
});

it('409 paymentAmountOutOfDate: the server message, then the screen reloads the payment', async () => {
  const onPaymentOutdated = jest.fn();
  directFormMock.mockRejectedValueOnce(conflict('server.payment.paymentAmountOutOfDate', 'Ödeme tutarı güncel değil.'));
  renderForm({ onPaymentOutdated });
  fillNewCard();
  acceptAndPay();
  await waitFor(() => expect(mockAlert).toHaveBeenCalled());
  const [title, message, buttons] = (mockAlert as jest.Mock).mock.calls[0];
  expect([title, message]).toEqual(['Hata', 'Ödeme tutarı güncel değil.']);
  expect(onPaymentOutdated).not.toHaveBeenCalled();
  buttons[0].onPress();
  expect(onPaymentOutdated).toHaveBeenCalledTimes(1);
});

it('pay is blocked while a chosen count is being re-priced', async () => {
  let resolveSecond: (v: unknown) => void = jest.fn();
  optionsMock
    .mockResolvedValueOnce({ data: ANSWER })
    .mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)));
  directFormMock.mockRejectedValueOnce(conflict('server.payment.installmentPricingChanged'));
  renderForm();
  fillNewCard();
  fireEvent.press(await screen.findByTestId('installment-option-3'));
  acceptAndPay();
  await waitFor(() => expect(optionsMock).toHaveBeenCalledTimes(2));
  expect(payTitle()).toBeDisabled();
  fireEvent.press(screen.getByTestId('card-submit'));
  expect(directFormMock).toHaveBeenCalledTimes(1);
  resolveSecond({ data: ANSWER });
  await waitFor(() => expect(payTitle()).not.toBeDisabled());
});

it('saved card: options by savedCardId on selection; the body has the count and no BIN', async () => {
  listCardsMock.mockResolvedValue({
    data: [{ id: 'c-1', last4: '4242', brand: 'Visa', purpose: 'checkout', requireCvv: false }],
  });
  renderForm({ cardStorageEnabled: true, purpose: 'checkout' });
  fireEvent.press(await screen.findByTestId('installment-option-3'));
  expect(optionsMock.mock.calls[0][0]).toEqual({ savedCardId: 'c-1', paymentId: 'pay-1' });
  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalled());
  expect(directFormMock.mock.calls[0][0]).toEqual({
    orderId: 'o-1',
    paymentId: 'pay-1',
    savedCardId: 'c-1',
    distanceSalesAccepted: true,
    installment: { count: 3, expectedTotal: 1066.38 },
  });
});

it('guest: options and direct-form go through the guest client (payment capability)', async () => {
  renderForm({ isGuest: true });
  fillNewCard();
  fireEvent.press(await screen.findByTestId('installment-option-3'));
  expect(optionsGuestMock).toHaveBeenCalledWith({ bin: '45467112', paymentId: 'pay-1' }, expect.anything());
  expect(optionsMock).not.toHaveBeenCalled();
  acceptAndPay();
  await waitFor(() => expect(directFormGuestMock).toHaveBeenCalled());
  expect(directFormGuestMock.mock.calls[0][0].installment).toEqual({ count: 3, bin: '45467112', expectedTotal: 1066.38 });
  expect(directFormMock).not.toHaveBeenCalled();
});
