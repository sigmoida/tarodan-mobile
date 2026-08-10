/**
 * Kargoya verme diyaloğu — YÖNERGE VARSA NUMARA DA VAR.
 *
 * Diyalog "Paketi şubeye teslim ederken BU NUMARAYI veriniz" diyor ama elle
 * giriş kalkınca numaranın göründüğü tek yer de gitmişti. Satıcının şubede
 * vereceği numara iç referanstır (`trackingNumber`, `PKG-…`) — gerçek Sürat
 * kodu değil.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('@/lib/api', () => ({
  shippingApi: { getOrderShipments: jest.fn() },
}));

import { shippingApi } from '@/lib/api';
import { ShipDialog } from '../_modals/ShipDialog';

const getShipment = shippingApi.getOrderShipments as jest.Mock;

const actions = () =>
  ({
    shipDialog: { visible: true, order: { id: 'o1', product: { title: 'Deri Ceket' } } },
    setShipDialog: jest.fn(),
    handleShip: jest.fn(),
    updateStatusMutation: { isPending: false },
  }) as any;

beforeEach(() => getShipment.mockReset());

it('şubede verilecek referans numarasını GÖSTERİR', async () => {
  getShipment.mockResolvedValue({
    data: {
      id: 's1', orderId: 'o1', provider: 'surat',
      trackingNumber: 'PKG-CMRGW9D6ZH', providerTrackingId: null,
      trackingUrl: null, status: 'label_created',
    },
  });

  renderWithProviders(<ShipDialog actions={actions()} />);

  await waitFor(() => expect(screen.getByTestId('ship-dialog-reference')).toBeOnTheScreen());
  expect(screen.getByText('PKG-CMRGW9D6ZH')).toBeOnTheScreen();
  expect(screen.getByText(/bu numarayı veriniz/i)).toBeOnTheScreen();
});

it('gösterecek numara yokken "bu numarayı veriniz" DEMEZ', async () => {
  getShipment.mockRejectedValue({ response: { status: 404 } });

  renderWithProviders(<ShipDialog actions={actions()} />);

  await waitFor(() => expect(screen.getByText('Deri Ceket')).toBeOnTheScreen());
  expect(screen.queryByTestId('ship-dialog-reference')).toBeNull();
  expect(screen.queryByText(/bu numarayı veriniz/i)).toBeNull();
});
