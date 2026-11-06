/**
 * `useInstallmentOptions` (ADR 0019, plan 5.1): debounce, cancellation of a stale card's
 * request, the guest capability path, the saved-card body and the single-payment fallback.
 */
import React from 'react';
import { Text } from 'react-native';
import { act, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import type { InstallmentCardSource } from '../installments';
import { INSTALLMENT_OPTIONS_DEBOUNCE_MS } from '../installments';

jest.mock('@/lib/api', () => ({
  paymentsApi: { installmentOptions: jest.fn(), installmentOptionsGuest: jest.fn() },
}));
jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));
import { paymentsApi } from '@/lib/api';
import { captureException } from '@/services/sentry';
import { useInstallmentOptions } from '../useInstallmentOptions';

const memberMock = paymentsApi.installmentOptions as jest.Mock;
const guestMock = paymentsApi.installmentOptionsGuest as jest.Mock;
const captureMock = captureException as jest.Mock;

const ANSWER = {
  enabled: true,
  baseAmount: 1000,
  options: [
    { count: 1, totalAmount: 1000, feeAmount: 0, monthlyAmount: 1000 },
    { count: 3, totalAmount: 1066.38, feeAmount: 66.38, monthlyAmount: 355.46 },
  ],
};

function Probe(props: { source: InstallmentCardSource | null; isGuest?: boolean; enabled?: boolean }) {
  const { state } = useInstallmentOptions({
    paymentId: 'pay-1',
    isGuest: props.isGuest ?? false,
    source: props.source,
    enabled: props.enabled ?? true,
  });
  const text =
    state.status === 'done'
      ? state.offer.kind === 'options'
        ? `options:${state.offer.options.map((o) => o.count).join(',')}`
        : state.offer.kind === 'single'
          ? `single:${state.offer.reason}`
          : 'hidden'
      : state.status;
  return <Text testID="state">{text}</Text>;
}

const stateText = () => screen.getByTestId('state').props.children as string;
const bin = (b: string): InstallmentCardSource => ({ kind: 'bin', bin: b });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

it('idle without a card or when disabled; no request', () => {
  const { rerender } = renderWithProviders(<Probe source={null} />);
  expect(stateText()).toBe('idle');
  rerender(<Probe source={bin('45467112')} enabled={false} />);
  act(() => jest.advanceTimersByTime(INSTALLMENT_OPTIONS_DEBOUNCE_MS));
  expect(stateText()).toBe('idle');
  expect(memberMock).not.toHaveBeenCalled();
});

it('debounces the BIN: one request for the last card, sent only after the pause', async () => {
  memberMock.mockResolvedValue({ data: ANSWER });
  const { rerender } = renderWithProviders(<Probe source={null} />);
  rerender(<Probe source={bin('45467112')} />);
  expect(stateText()).toBe('loading');
  act(() => jest.advanceTimersByTime(INSTALLMENT_OPTIONS_DEBOUNCE_MS - 50));
  rerender(<Probe source={bin('54001234')} />);
  act(() => jest.advanceTimersByTime(INSTALLMENT_OPTIONS_DEBOUNCE_MS - 50));
  expect(memberMock).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(50));
  await waitFor(() => expect(stateText()).toBe('options:1,3'));
  expect(memberMock).toHaveBeenCalledTimes(1);
  expect(memberMock.mock.calls[0][0]).toEqual({ bin: '54001234', paymentId: 'pay-1' });
  expect(guestMock).not.toHaveBeenCalled();
});

it('a new card aborts the stale request and never shows its answer', async () => {
  const signals: AbortSignal[] = [];
  memberMock.mockImplementation((body: { bin: string }, config: { signal: AbortSignal }) => {
    signals.push(config.signal);
    if (body.bin === '45467112') return new Promise(jest.fn()); // never answers
    return Promise.resolve({ data: { ...ANSWER, options: [ANSWER.options[0]] } });
  });
  const { rerender } = renderWithProviders(<Probe source={bin('45467112')} />);
  await waitFor(() => expect(memberMock).toHaveBeenCalledTimes(1));
  rerender(<Probe source={bin('54001234')} />);
  // While the debounce runs, the old card's state is not shown.
  expect(stateText()).toBe('loading');
  act(() => jest.advanceTimersByTime(INSTALLMENT_OPTIONS_DEBOUNCE_MS));
  await waitFor(() => expect(stateText()).toBe('single:card_not_eligible'));
  expect(signals[0].aborted).toBe(true);
  expect(signals[1].aborted).toBe(false);
});

it('guest: the guest client (payment capability header, no Bearer)', async () => {
  guestMock.mockResolvedValue({ data: ANSWER });
  renderWithProviders(<Probe source={bin('45467112')} isGuest />);
  await waitFor(() => expect(stateText()).toBe('options:1,3'));
  expect(guestMock).toHaveBeenCalledWith({ bin: '45467112', paymentId: 'pay-1' }, expect.objectContaining({ signal: expect.anything() }));
  expect(memberMock).not.toHaveBeenCalled();
});

it('saved card: savedCardId, no BIN', async () => {
  memberMock.mockResolvedValue({ data: ANSWER });
  renderWithProviders(<Probe source={{ kind: 'saved', savedCardId: 'c-1' }} />);
  await waitFor(() => expect(stateText()).toBe('options:1,3'));
  expect(memberMock.mock.calls[0][0]).toEqual({ savedCardId: 'c-1', paymentId: 'pay-1' });
});

it('429 falls back to the single payment, not reported to Sentry', async () => {
  memberMock.mockRejectedValue({ response: { status: 429, data: { i18nKey: 'server.payment.installmentOptionsTooManyRequests' } } });
  renderWithProviders(<Probe source={bin('45467112')} />);
  await waitFor(() => expect(stateText()).toBe('single:unavailable'));
  expect(memberMock).toHaveBeenCalledTimes(1); // no retry
  expect(captureMock).not.toHaveBeenCalled();
});

it('5xx falls back to the single payment and is reported with the payment id, never the BIN', async () => {
  memberMock.mockRejectedValue({ response: { status: 503, data: {} } });
  renderWithProviders(<Probe source={bin('45467112')} />);
  await waitFor(() => expect(stateText()).toBe('single:unavailable'));
  expect(captureMock).toHaveBeenCalledTimes(1);
  const [, options] = captureMock.mock.calls[0];
  expect(options.tags).toEqual({ flow: 'payment.installmentOptions', card_source: 'bin' });
  expect(options.extra).toEqual({ paymentId: 'pay-1', status: 503 });
  expect(JSON.stringify(options)).not.toContain('45467112');
});
