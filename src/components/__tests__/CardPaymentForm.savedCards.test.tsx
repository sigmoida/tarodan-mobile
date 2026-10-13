/**
 * API delta 20 — kayıtlı kartlar ödeme amacına (PayTR mağazasına) göre.
 *
 * Eskiden `listCards()` amaçsız çağrılıyordu: iki mağazanın kartı karışık geliyor,
 * ilk kart otomatik seçiliyordu → diğer mağazanın kartıyla direct-form
 * `404 server.payment.savedCardNotFound`. Kart saklama da `recurringEnabled`'a
 * bağlıydı → sepette kayıtlı kart hiç görünmüyordu.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAYTR_ACTION } from '@/lib/payment/paytrDirectForm';

let mockCanBuyDigital = true;
jest.mock('@/lib/purchases', () => ({
  get CAN_BUY_DIGITAL() {
    return mockCanBuyDigital;
  },
}));
jest.mock('@/lib/api', () => ({
  paymentsApi: {
    directForm: jest.fn(),
    verify: jest.fn(() => Promise.resolve({})),
    getStatusLight: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
    getStatusLightGuest: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
  },
  membershipApi: { listCards: jest.fn() },
}));
import { paymentsApi, membershipApi } from '@/lib/api';

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: () => React.createElement(View, { testID: 'paytr-webview' }),
    WebViewNavigation: {},
  };
});

import CardPaymentForm from '../CardPaymentForm';

const directFormMock = paymentsApi.directForm as jest.Mock;
const listCardsMock = membershipApi.listCards as jest.Mock;

const signed = {
  paymentId: 'pay-9',
  action: PAYTR_ACTION,
  method: 'POST',
  fields: [{ name: 'merchant_id', value: '1' }],
  savedCard: true,
  requireCvv: false,
};

const card = (over: Record<string, unknown>) => ({
  last4: '4242',
  brand: 'Visa',
  expMonth: '12',
  expYear: '30',
  requireCvv: false,
  isDefault: false,
  autoRenewEligible: false,
  ...over,
});

function fillNewCard() {
  fireEvent.changeText(screen.getByTestId('card-holder'), 'Ahmet Yılmaz');
  fireEvent.changeText(screen.getByTestId('card-number'), '4111111111111111');
  fireEvent.changeText(screen.getByTestId('card-exp-month'), '07');
  fireEvent.changeText(screen.getByTestId('card-exp-year'), '28');
  fireEvent.changeText(screen.getByTestId('card-cvc'), '123');
}

/** Mesafeli satış onayı her ödemede zorunlu (web `PaymentReady`). */
function acceptAndPay() {
  fireEvent.press(screen.getByTestId('payment-distance-sales-checkbox'));
  fireEvent.press(screen.getByTestId('card-submit'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCanBuyDigital = true;
  directFormMock.mockResolvedValue({ data: signed });
});

it('sepet ödemesi: kartlar `checkout` amacıyla istenir, ilk kart seçilir ve gövdeye o gider', async () => {
  listCardsMock.mockResolvedValue({ data: [card({ id: 'c-shop', last4: '1111', purpose: 'checkout' })] });
  renderWithProviders(
    <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} purpose="checkout" cardStorageEnabled onSuccess={jest.fn()} />,
  );

  await waitFor(() => expect(screen.getByText(/1111/)).toBeOnTheScreen());
  expect(listCardsMock).toHaveBeenCalledWith('checkout');

  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalled());
  expect(directFormMock.mock.calls[0][0]).toEqual({ checkoutGroupId: 'g-1', savedCardId: 'c-shop', distanceSalesAccepted: true });
});

it('kullanıcının seçtiği kart korunur; yeni karta geçince gövdede savedCardId yok', async () => {
  listCardsMock.mockResolvedValue({
    data: [card({ id: 'c-1', last4: '1111', purpose: 'checkout' }), card({ id: 'c-2', last4: '2222', purpose: 'checkout' })],
  });
  renderWithProviders(
    <CardPaymentForm target={{ checkoutGroupId: 'g-1' }} purpose="checkout" cardStorageEnabled onSuccess={jest.fn()} />,
  );
  await waitFor(() => expect(screen.getByText(/2222/)).toBeOnTheScreen());
  fireEvent.press(screen.getByText(/2222/));
  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalledTimes(1));
  expect(directFormMock.mock.calls[0][0]).toMatchObject({ savedCardId: 'c-2' });
});

it('üyelik ödemesi: kartlar `membership` amacıyla istenir', async () => {
  listCardsMock.mockResolvedValue({ data: [card({ id: 'c-mem', purpose: 'membership', autoRenewEligible: true })] });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'o-mem' }} purpose="membership" cardStorageEnabled onSuccess={jest.fn()} />,
  );
  await waitFor(() => expect(listCardsMock).toHaveBeenCalledWith('membership'));
});

it('başka mağazanın kartı gelse bile listelenmez/seçilmez → yeni kart (404 savedCardNotFound önlenir)', async () => {
  listCardsMock.mockResolvedValue({ data: [card({ id: 'c-mem', last4: '9999', purpose: 'membership' })] });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'o-1' }} purpose="checkout" cardStorageEnabled onSuccess={jest.fn()} />,
  );

  await waitFor(() => expect(screen.getByTestId('card-holder')).toBeOnTheScreen());
  expect(screen.queryByText(/9999/)).toBeNull();

  fillNewCard();
  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalled());
  const body = directFormMock.mock.calls[0][0];
  expect(body).not.toHaveProperty('savedCardId');
  expect(body).toEqual({ orderId: 'o-1', saveCard: true, distanceSalesAccepted: true });
});

it('eski API (kartta `purpose` yok): kart olduğu gibi kullanılır', async () => {
  listCardsMock.mockResolvedValue({ data: [card({ id: 'c-old', last4: '5555' })] });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'o-1' }} purpose="checkout" cardStorageEnabled onSuccess={jest.fn()} />,
  );
  await waitFor(() => expect(screen.getByText(/5555/)).toBeOnTheScreen());
});

it('yeni kart: "kartımı sakla" varsayılan işaretli, `saveCard` her zaman açıkça gider (kaldırılınca false)', async () => {
  listCardsMock.mockResolvedValue({ data: [] });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'o-1' }} purpose="checkout" cardStorageEnabled onSuccess={jest.fn()} />,
  );
  await waitFor(() => expect(screen.getByTestId('card-save')).toBeOnTheScreen());
  // Sepette abonelik ifadesi yok — "sonraki ödemeler".
  expect(screen.getByText("Kartımı sonraki ödemeler için PayTR'da sakla")).toBeOnTheScreen();
  expect(screen.queryByText(/yenileme/i)).toBeNull();

  fireEvent.press(screen.getByTestId('card-save'));
  fillNewCard();
  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalled());
  expect(directFormMock.mock.calls[0][0]).toEqual({ orderId: 'o-1', saveCard: false, distanceSalesAccepted: true });
});

it('üyelik + dijital satış açık: "otomatik yenileme için sakla" ve açıklaması', async () => {
  listCardsMock.mockResolvedValue({ data: [] });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'o-mem' }} purpose="membership" cardStorageEnabled onSuccess={jest.fn()} />,
  );
  expect(await screen.findByText('Kartımı otomatik yenileme için sakla')).toBeOnTheScreen();
  expect(screen.getByText(/dönem sonunda otomatik yenilenir/)).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('card-save'));
  expect(screen.getByText(/otomatik yenileme kapalı kalır/)).toBeOnTheScreen();
});

it('üyelik + dijital satış KAPALI: abonelik ifadesi yok (Apple 2.1(b))', async () => {
  mockCanBuyDigital = false;
  listCardsMock.mockResolvedValue({ data: [] });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'o-mem' }} purpose="membership" cardStorageEnabled onSuccess={jest.fn()} />,
  );
  expect(await screen.findByText("Kartımı sonraki ödemeler için PayTR'da sakla")).toBeOnTheScreen();
  expect(screen.queryByText(/yenile/i)).toBeNull();
});

it('kart saklama kapalı: kart listesi istenmez, kutu yok, `saveCard: false`', async () => {
  renderWithProviders(
    <CardPaymentForm target={{ tradeId: 't-1' }} purpose="checkout" cardStorageEnabled={false} onSuccess={jest.fn()} />,
  );
  expect(listCardsMock).not.toHaveBeenCalled();
  expect(screen.queryByTestId('card-save')).toBeNull();
  fillNewCard();
  acceptAndPay();
  await waitFor(() => expect(directFormMock).toHaveBeenCalled());
  expect(directFormMock.mock.calls[0][0]).toEqual({ tradeId: 't-1', saveCard: false, distanceSalesAccepted: true });
});
