/**
 * Ödeme ekranı → kart formu: ödeme amacı (PayTR mağazası) ve kart saklama
 * yeteneği (API delta 20).
 *
 * - Üyelik → `membership`; sepet / sipariş / takas / öne çıkarma → `checkout`
 *   (API'de `boost` amacı yok — eskiden `boost` diye sorgulanıyordu).
 * - Kart saklama `purposes[amaç].cardStorageEnabled`'dan (eskiden `recurringEnabled`
 *   → sepette kayıtlı kart hiç görünmüyordu); misafirde kapalı.
 * - Rota `type` taşımasa da (başarısız ödeme / Ödemelerim'den yeniden deneme)
 *   üyelik, durum yanıtındaki `isMembershipOrder` ile tanınır.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { id: 'pay-1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>REDIRECT:{href}</Text>;
  },
}));
import { router } from 'expo-router';
const replaceMock = router.replace as jest.Mock;

let mockCanBuyDigital = true;
jest.mock('@/lib/purchases', () => ({
  get CAN_BUY_DIGITAL() {
    return mockCanBuyDigital;
  },
}));

jest.mock('@/lib/api', () => ({
  paymentsApi: {
    getConfig: jest.fn(),
    getStatusLight: jest.fn(),
    getStatusLightGuest: jest.fn(),
    bypassComplete: jest.fn(),
  },
}));
import { paymentsApi } from '@/lib/api';

jest.mock('@/components/CardPaymentForm', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ purpose, cardStorageEnabled }: any) =>
      React.createElement(Text, { testID: 'card-payment-form' }, `purpose:${purpose} storage:${String(cardStorageEnabled)}`),
  };
});
jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));

import PaymentScreen from '../[id]';

const getConfigMock = paymentsApi.getConfig as jest.Mock;
const getStatusLightMock = paymentsApi.getStatusLight as jest.Mock;
const getStatusLightGuestMock = paymentsApi.getStatusLightGuest as jest.Mock;
const bypassMock = paymentsApi.bypassComplete as jest.Mock;

const LIVE = {
  bypassEnabled: false,
  cardStorageEnabled: true,
  recurringEnabled: true,
  purposes: {
    checkout: { cardStorageEnabled: true, recurringEnabled: false },
    membership: { cardStorageEnabled: true, recurringEnabled: true },
  },
};

async function formText() {
  return (await screen.findByTestId('card-payment-form')).props.children as string;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'pay-1' };
  mockCanBuyDigital = true;
  getConfigMock.mockResolvedValue({ data: LIVE });
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', orderId: 'order-1', amount: 100 } });
});

it('sipariş (teklif) ödemesi: amaç checkout, kart saklama sepet bayrağından AÇIK', async () => {
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('purpose:checkout storage:true');
});

it('sepette kart saklama kapalıysa kapalı — üst düzey recurring açık olsa da', async () => {
  getConfigMock.mockResolvedValue({
    data: { ...LIVE, purposes: { ...LIVE.purposes, checkout: { cardStorageEnabled: false, recurringEnabled: false } } },
  });
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('purpose:checkout storage:false');
});

it('öne çıkarma (type=boost): API amacı `checkout` (pazaryeri mağazası)', async () => {
  mockParams = { id: 'pay-1', type: 'boost' };
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('purpose:checkout storage:true');
});

it('üyelik (type=membership): amaç membership', async () => {
  mockParams = { id: 'pay-1', type: 'membership' };
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('purpose:membership storage:true');
});

it('üyelik rota parametresi olmadan da durum yanıtından tanınır (yeniden deneme)', async () => {
  getStatusLightMock.mockResolvedValue({
    data: { status: 'pending', orderId: 'order-m', amount: 100, isMembershipOrder: true },
  });
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('purpose:membership storage:true');
});

it('misafir: kayıtlı kart yok', async () => {
  mockParams = { id: 'pay-1', guest: '1' };
  getStatusLightGuestMock.mockResolvedValue({ data: { status: 'pending', checkoutGroupId: 'g-1', amount: 100 } });
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('purpose:checkout storage:false');
});

it('config alınamazsa güvenli varsayılan: kart saklama kapalı', async () => {
  getConfigMock.mockRejectedValue(new Error('net'));
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('purpose:checkout storage:false');
});

it('config ve durum AYNI ANDA istenir (config beklenmez)', async () => {
  let releaseConfig: (v: unknown) => void = () => {};
  getConfigMock.mockReturnValue(new Promise((r) => (releaseConfig = r)));
  renderWithProviders(<PaymentScreen />);
  // Config henüz dönmedi ama durum isteği çoktan gitti.
  await waitFor(() => expect(getStatusLightMock).toHaveBeenCalledWith('pay-1'));
  expect(screen.queryByTestId('card-payment-form')).toBeNull();
  releaseConfig({ data: LIVE });
  expect(await formText()).toBe('purpose:checkout storage:true');
});

it('durum hatası config başarılı olsa da hata ekranına düşer', async () => {
  getStatusLightMock.mockRejectedValue({ response: { status: 500, data: { message: 'boom' } } });
  renderWithProviders(<PaymentScreen />);
  expect(await screen.findByText('boom')).toBeOnTheScreen();
  expect(screen.queryByTestId('card-payment-form')).toBeNull();
});

it('tamamlanmış üyelik ödemesi (type yok, durum üyelik dedi) → üyelik başarı ekranı', async () => {
  getStatusLightMock.mockResolvedValue({ data: { status: 'completed', orderId: 'order-m', isMembershipOrder: true } });
  renderWithProviders(<PaymentScreen />);
  await waitFor(() =>
    expect(replaceMock).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/membership/success' })),
  );
});

describe('dijital satış kapalı (CAN_BUY_DIGITAL=false)', () => {
  beforeEach(() => {
    mockCanBuyDigital = false;
  });

  it('durum yanıtı üyelik derse kart formu YOK, bypass YOK, /membership\'e döner', async () => {
    getConfigMock.mockResolvedValue({ data: { ...LIVE, bypassEnabled: true } });
    getStatusLightMock.mockResolvedValue({
      data: { status: 'pending', orderId: 'order-m', amount: 100, isMembershipOrder: true },
    });
    renderWithProviders(<PaymentScreen />);
    expect(await screen.findByText('REDIRECT:/membership')).toBeOnTheScreen();
    expect(screen.queryByTestId('card-payment-form')).toBeNull();
    expect(bypassMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('fiziksel sipariş etkilenmez', async () => {
    renderWithProviders(<PaymentScreen />);
    expect(await formText()).toBe('purpose:checkout storage:true');
  });
});
