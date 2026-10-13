/**
 * Takas itirazı EKRANI (`trade/[id]/dispute`) — eski DisputeTradeModal + A3 sözleşmesi ekrana taşındı:
 *  - kırpılmış açıklama < 10 karakter: istek ve toast YOK, hata alanın altında; yazmaya
 *    başlayınca hata temizlenir;
 *  - geçerli: istek gider (açıklama kırpılır); başarıda önce geri çık, sonra `toast.success`,
 *    taslak silinir;
 *  - sunucu hatası: `toast.error(sunucu mesajı | yedek)`, ekran ve metin kalır;
 *  - taslak korunur: ekrandan çıkıp yeniden açınca açıklama geri gelir (çıkış onaysız).
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { backMock, canGoBackMock, emitBeforeRemove, resetRouterMocks } from '@/test-utils/router-mock';
import { tradesApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useDisputeDraftStore } from '@/stores/disputeDraftStore';
import TradeDisputeScreen from '../[id]/dispute';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'tr' }),
}));
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ id: 't1' }),
}));
jest.mock('@/lib/api', () => ({ tradesApi: { raiseDispute: jest.fn() } }));

const raiseMock = tradesApi.raiseDispute as jest.Mock;
const VALID = 'Kargo kutusu ezik geldi, ürün çalışmıyor.';

let successSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  canGoBackMock.mockReturnValue(true);
  useDisputeDraftStore.getState().clearAll();
  raiseMock.mockResolvedValue({ data: {} });
  successSpy = jest.spyOn(toast, 'success').mockImplementation(() => 'id');
  errorSpy = jest.spyOn(toast, 'error').mockImplementation(() => 'id');
});
afterEach(() => {
  successSpy.mockRestore();
  errorSpy.mockRestore();
});

const input = () => screen.getByTestId('trade-dispute-description-input');
const submit = () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('trade-dispute-submit-button'));
  });

it('kısa açıklama: istek ve toast yok, hata alanın altında; yazmaya başlayınca temizlenir', async () => {
  renderWithProviders(<TradeDisputeScreen />);
  fireEvent.changeText(input(), '   kısa    ');
  await submit();

  expect(await screen.findByText('trade.dispute.minLengthError')).toBeOnTheScreen();
  expect(raiseMock).not.toHaveBeenCalled();
  expect(errorSpy).not.toHaveBeenCalled();
  expect(backMock).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.changeText(input(), 'kısa d');
  });
  expect(screen.queryByText('trade.dispute.minLengthError')).toBeNull();
});

it('geçerli: kırpılmış açıklama + varsayılan neden gider; önce geri çık, sonra başarı toast; taslak silinir', async () => {
  let resolve!: (v: unknown) => void;
  raiseMock.mockReturnValue(new Promise((r) => (resolve = r)));
  const { queryClient } = renderWithProviders(<TradeDisputeScreen />);
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  fireEvent.changeText(input(), `  ${VALID}  `);
  expect(useDisputeDraftStore.getState().drafts.t1).toBe(`  ${VALID}  `);
  await submit();

  await waitFor(() =>
    expect(raiseMock).toHaveBeenCalledWith('t1', { reason: 'not_as_described', description: VALID }),
  );
  expect(successSpy).not.toHaveBeenCalled();
  expect(backMock).not.toHaveBeenCalled(); // istek bitmeden ekran kalır

  await act(async () => resolve({ data: {} }));
  await waitFor(() => expect(successSpy).toHaveBeenCalledWith('trade.dispute.successMessage'));
  expect(backMock).toHaveBeenCalledTimes(1);
  expect(backMock.mock.invocationCallOrder[0]).toBeLessThan(successSpy.mock.invocationCallOrder[0]);
  expect(useDisputeDraftStore.getState().drafts.t1).toBeUndefined();
  const keys = invalidate.mock.calls.map(([f]) => f?.queryKey);
  expect(keys).toEqual(expect.arrayContaining([qk.trades.detail('t1'), qk.trades.all]));
});

it('sunucu hatası: toast.error(sunucu mesajı), ekran ve açıklama kalır', async () => {
  raiseMock.mockRejectedValue({ response: { data: { message: ['Süre dolmuş'] } } });
  renderWithProviders(<TradeDisputeScreen />);
  fireEvent.changeText(input(), VALID);
  await submit();

  await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Süre dolmuş'));
  expect(successSpy).not.toHaveBeenCalled();
  expect(backMock).not.toHaveBeenCalled();
  expect(input().props.value).toBe(VALID);
  expect(useDisputeDraftStore.getState().drafts.t1).toBe(VALID);
});

it('sunucu mesajı yoksa itiraz yedek metni', async () => {
  raiseMock.mockRejectedValue({ response: { data: {} } });
  renderWithProviders(<TradeDisputeScreen />);
  fireEvent.changeText(input(), VALID);
  await submit();
  await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('trade.dispute.errorMessage'));
});

it('taslak korunur: çıkış onaysız, yeniden açınca açıklama geri gelir', async () => {
  const first = renderWithProviders(<TradeDisputeScreen />);
  fireEvent.changeText(input(), 'Yarım kalan itiraz metni');
  expect(emitBeforeRemove().prevented).toBe(false);
  first.unmount();

  renderWithProviders(<TradeDisputeScreen />);
  expect(input().props.value).toBe('Yarım kalan itiraz metni');
});

it('alt çubukta gönder; açıklama 1000 karakterle sınırlı (web)', () => {
  renderWithProviders(<TradeDisputeScreen />);
  expect(screen.getByTestId('page-shell-footer')).toContainElement(
    screen.getByTestId('trade-dispute-submit-button'),
  );
  expect(input().props.maxLength).toBe(1000);
});
