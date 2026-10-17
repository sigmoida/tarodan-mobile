/**
 * BoostModal (BottomSheet): paket/süre seçimi, footer'da toplam fiyat + onay; ödeme ekranına
 * yönlendirme sheet TAMAMEN kapandıktan sonra çalışır (src/ui/CLAUDE.md › iOS modal rule).
 */
import React from 'react';
import { Modal } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { BoostModal } from '../BoostModal';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));

const mockGetBoostOptions = jest.fn();
const mockInitiateBoost = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  productsApi: {
    getBoostOptions: (...a: unknown[]) => mockGetBoostOptions(...a),
    getBoostPricing: jest.fn().mockRejectedValue(new Error('no')),
    initiateBoost: (...a: unknown[]) => mockInitiateBoost(...a),
  },
}));

const PACKAGES = {
  data: {
    packages: [
      {
        id: 'pkg1',
        name: 'Vitrin',
        durations: [
          { durationDays: 3, price: 50 },
          { durationDays: 7, price: 90 },
        ],
      },
    ],
  },
};

function Harness({ onCloseSpy }: { onCloseSpy?: () => void }) {
  const [open, setOpen] = React.useState(true);
  return (
    <BoostModal
      visible={open}
      onClose={() => {
        onCloseSpy?.();
        setOpen(false);
      }}
      listingId="p1"
      listingTitle="Ferrari"
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBoostOptions.mockResolvedValue(PACKAGES);
});

describe('BoostModal (BottomSheet)', () => {
  it('varsayılan 7 günlük paketi seçer; footer toplam fiyatı gösterir, satır seçimi toplamı günceller', async () => {
    renderWithProviders(<Harness />);
    await waitFor(() => expect(screen.getByTestId('boost-option-7')).toBeTruthy());
    expect(screen.getByTestId('boost-option-7').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('boost-total')).toHaveTextContent('90,00 TL');
    fireEvent.press(screen.getByTestId('boost-option-3'));
    expect(screen.getByTestId('boost-total')).toHaveTextContent('50,00 TL');
  });

  it('onayda ödeme ekranı sheet KAPANDIKTAN sonra açılır (runAfterClose)', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    mockInitiateBoost.mockResolvedValue({
      data: { data: { paymentId: 'pay1', paymentUrl: 'https://paytr/x' } },
    });
    const onCloseSpy = jest.fn();
    renderWithProviders(<Harness onCloseSpy={onCloseSpy} />);
    await waitFor(() => expect(screen.getByTestId('boost-confirm-button')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('boost-confirm-button')).not.toBeDisabled());

    await act(async () => {
      fireEvent.press(screen.getByTestId('boost-confirm-button'));
    });
    expect(mockInitiateBoost).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ durationDays: 7, packageId: 'pkg1', autoRenew: false, provider: 'paytr' }),
    );
    // Sheet kapanma istendi ama native Modal henüz sökülmedi: yönlendirme bekler.
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    act(() => {
      screen.UNSAFE_queryAllByType(Modal).forEach((m) => m.props.onDismiss?.());
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/payment/[id]',
        params: expect.objectContaining({ id: 'pay1', type: 'boost', paymentUrl: 'https://paytr/x' }),
      }),
    );
    jest.useRealTimers();
  });

  it('paket yoksa boş durum gösterir ve onay düğmesi kilitli kalır', async () => {
    mockGetBoostOptions.mockResolvedValue({ data: { packages: [] } });
    renderWithProviders(<Harness />);
    await waitFor(() => expect(screen.queryByTestId('boost-loading')).toBeNull());
    expect(screen.getByTestId('boost-confirm-button')).toBeDisabled();
  });
});
