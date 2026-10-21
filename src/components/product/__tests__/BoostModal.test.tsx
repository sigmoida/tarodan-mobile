/**
 * BoostModal (BottomSheet): package/duration pick, total price + confirm in the footer; the
 * redirect to the payment screen runs after the sheet is FULLY closed
 * (src/ui/CLAUDE.md > iOS modal rule). The fixture mirrors the real
 * GET /products/:id/boost/options shape (`packages[].options[]`).
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
    initiateBoost: (...a: unknown[]) => mockInitiateBoost(...a),
  },
}));

/** Real API shape: product-boost.service.ts `getBoostOptions`. */
const PACKAGES = {
  data: {
    enabled: true,
    productPrice: 1000,
    packages: [
      {
        id: 'pkg1',
        name: 'Vitrin',
        slug: 'vitrin',
        showcaseOnHome: true,
        options: [
          { durationDays: 3, price: 50, listPrice: 50, campaign: false, label: '3 gün' },
          { durationDays: 7, price: 90, listPrice: 120, campaign: true, label: '7 gün' },
        ],
      },
      {
        id: 'pkg2',
        name: 'Standart',
        slug: 'standart',
        showcaseOnHome: false,
        options: [{ durationDays: 7, price: 40, listPrice: 40, campaign: false, label: '7 gün' }],
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
  it('reads packages[].options[]: selects the first 7-day option, footer shows its price, rows update the total', async () => {
    renderWithProviders(<Harness />);
    await waitFor(() => expect(screen.getByTestId('boost-option-pkg1-7')).toBeTruthy());
    expect(screen.getByTestId('boost-option-pkg1-7').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('boost-total')).toHaveTextContent('90,00 TL');
    fireEvent.press(screen.getByTestId('boost-option-pkg1-3'));
    expect(screen.getByTestId('boost-total')).toHaveTextContent('50,00 TL');
  });

  it('keeps same-duration options of different packages apart (own row, own price, own packageId)', async () => {
    renderWithProviders(<Harness />);
    await waitFor(() => expect(screen.getByTestId('boost-option-pkg2-7')).toBeTruthy());
    expect(screen.getByTestId('boost-option-pkg1-7').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('boost-option-pkg2-7').props.accessibilityState).toMatchObject({ checked: false });
    fireEvent.press(screen.getByTestId('boost-option-pkg2-7'));
    expect(screen.getByTestId('boost-option-pkg2-7').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('boost-option-pkg1-7').props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByTestId('boost-total')).toHaveTextContent('40,00 TL');
  });

  it('on confirm the payment screen opens AFTER the sheet closed (runAfterClose)', async () => {
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
    // Close was requested but the native Modal is not torn down yet: the redirect waits.
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

  it('shows the empty state and keeps confirm locked when there are no packages', async () => {
    mockGetBoostOptions.mockResolvedValue({ data: { enabled: true, productPrice: 1000, packages: [] } });
    renderWithProviders(<Harness />);
    await waitFor(() => expect(screen.queryByTestId('boost-loading')).toBeNull());
    expect(screen.getByTestId('boost-confirm-button')).toBeDisabled();
  });

  it('keeps confirm locked and hides the rows when the server reports boost disabled', async () => {
    mockGetBoostOptions.mockResolvedValue({ data: { ...PACKAGES.data, enabled: false } });
    renderWithProviders(<Harness />);
    await waitFor(() => expect(screen.queryByTestId('boost-loading')).toBeNull());
    expect(screen.queryByTestId('boost-option-pkg1-7')).toBeNull();
    expect(screen.getByTestId('boost-confirm-button')).toBeDisabled();
  });

  it('keeps confirm locked when the options request fails (no legacy flat-price fallback)', async () => {
    mockGetBoostOptions.mockRejectedValue(new Error('boom'));
    renderWithProviders(<Harness />);
    await waitFor(() => expect(screen.queryByTestId('boost-loading')).toBeNull());
    expect(screen.queryByTestId('boost-option-pkg1-7')).toBeNull();
    expect(screen.getByTestId('boost-confirm-button')).toBeDisabled();
    expect(mockInitiateBoost).not.toHaveBeenCalled();
  });
});
