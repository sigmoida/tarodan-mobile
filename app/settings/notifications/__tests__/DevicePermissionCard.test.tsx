/**
 * P2: Ayarlar → Bildirimler cihaz izni satırı — durum gösterilir; reddedilmiş ve tekrar
 * sorulamayan izinde "Ayarları Aç" (Linking.openSettings), sorulabilirde "İzin Ver"; izin
 * verildiği anda push kaydı yapılır.
 */
import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { renderWithProviders } from '@/test-utils';
import i18n from '@/i18n/config';

const mockRead = jest.fn();
const mockRequest = jest.fn();
jest.mock('@/lib/permissions/notifications', () => ({
  ...jest.requireActual('@/lib/permissions/notifications'),
  notificationPermission: {
    read: () => mockRead(),
    request: () => mockRequest(),
  },
}));
const mockSync = jest.fn(async () => 'registered');
jest.mock('@/services/push', () => ({
  ensureNotificationChannels: jest.fn(async () => undefined),
  syncPushRegistration: () => mockSync(),
}));

import { DevicePermissionCard } from '../_components/DevicePermissionCard';

beforeEach(() => {
  jest.clearAllMocks();
});

async function render() {
  renderWithProviders(<DevicePermissionCard />);
  await act(async () => {
    await Promise.resolve();
  });
}

it('reddedildi + sorulamaz → durum "Kapalı" ve "Ayarları Aç" cihaz ayarlarını açar', async () => {
  mockRead.mockResolvedValue({ status: 'denied', canAskAgain: false });
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never);
  await render();

  expect(screen.getByTestId('device-permission-status')).toHaveTextContent(
    i18n.t('notification.permission.denied'),
  );
  fireEvent.press(screen.getByTestId('device-permission-open-settings'));
  expect(openSettings).toHaveBeenCalled();
  expect(screen.queryByTestId('device-permission-allow')).toBeNull();
});

it('sorulabilir → "İzin Ver"; verilince push kaydı yapılır', async () => {
  mockRead.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
  mockRequest.mockResolvedValue({ status: 'granted', canAskAgain: false });
  await render();

  await act(async () => {
    fireEvent.press(screen.getByTestId('device-permission-allow'));
  });
  expect(mockRequest).toHaveBeenCalled();
  expect(mockSync).toHaveBeenCalled();
  expect(screen.getByTestId('device-permission-status')).toHaveTextContent(
    i18n.t('notification.permission.granted'),
  );
});

it('açık → yalnız durum, eylem yok', async () => {
  mockRead.mockResolvedValue({ status: 'granted', canAskAgain: false });
  await render();
  expect(screen.queryByTestId('device-permission-allow')).toBeNull();
  expect(screen.queryByTestId('device-permission-open-settings')).toBeNull();
});
