/**
 * Grup sipariş detayı — ALICI `PKG-`'yi HİÇ GÖRMEZ.
 *
 * Sunucu aynı gönderi için iki numara veriyor: `trackingNumber` (`PKG-…`)
 * Tarodan iç referansıdır ve satıcının şubede vereceği numaradır — Sürat onu
 * TANIMAZ. Alıcının takip edebileceği tek numara `cargoCode`
 * (`providerTrackingId`). Ekran iç referansı "Kargo Takibi" diye basıyordu.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => {
  const rm = require('@/test-utils/router-mock').routerMock;
  return { ...rm, useLocalSearchParams: () => ({ id: 'g1' }) };
});

import { GroupOrderRow } from '../_components/GroupSections';
import type { GroupOrder } from '../_lib/types';

const orderRow = (extra: Record<string, unknown> = {}): GroupOrder =>
  ({
    id: 'o1',
    orderNumber: 'ORD-2001000000',
    status: 'shipped',
    totalAmount: 350,
    product: { id: 'p1', title: 'Deri Ceket' },
    seller: { id: 's1', displayName: 'Satıcı' },
    ...extra,
  }) as GroupOrder;

const render = (extra: Record<string, unknown> = {}) =>
  renderWithProviders(<GroupOrderRow order={orderRow(extra)} multi={false} />);

describe('grup sipariş satırı · kargo numarası', () => {
  it('iç referansı (PKG-) ALICIYA GÖSTERMEZ', () => {
    render({
      trackingNumber: 'PKG-CMRGW9D6ZH',
      shipment: { provider: 'surat', trackingNumber: 'PKG-CMRGW9D6ZH', cargoCode: null },
    });

    expect(screen.queryByText(/PKG-/)).toBeNull();
  });

  it('kod yokken hazırlanıyor metnini gösterir', () => {
    render({
      trackingNumber: 'PKG-CMRGW9D6ZH',
      shipment: { provider: 'surat', trackingNumber: 'PKG-CMRGW9D6ZH', cargoCode: null },
    });

    expect(screen.getByTestId('group-tracking-text')).toBeOnTheScreen();
    expect(screen.getByText(/Satıcı paketinizi hazırlıyor/)).toBeOnTheScreen();
  });

  /**
   * Kapı `order.status`'te yalnız "teslim edildi"yi ayırıyordu; kargoya verilmiş
   * ama henüz teslim edilmemiş sipariş de "satıcı hazırlıyor" diyordu. Kod hiç
   * gelmediği için bu dal her gönderi de çalışıyor.
   */
  it('paket yola çıktıysa hazırlanıyor metnini GÖSTERMEZ', () => {
    render({
      trackingNumber: 'PKG-CMRGW9D6ZH',
      shipment: { provider: 'surat', trackingNumber: 'PKG-CMRGW9D6ZH', cargoCode: null, status: 'in_transit' },
    });

    expect(screen.queryByText(/hazırlıyor/)).toBeNull();
  });

  it('gerçek Sürat kodu geldiyse onu gösterir', () => {
    render({
      trackingNumber: 'PKG-CMRGW9D6ZH',
      cargoCode: '79174212154116',
      shipment: { provider: 'surat', trackingNumber: 'PKG-CMRGW9D6ZH', cargoCode: '79174212154116' },
    });

    expect(screen.getByText(/79174212154116/)).toBeOnTheScreen();
    expect(screen.queryByText(/PKG-/)).toBeNull();
  });

  it('kodu sipariş özetindeki shipment.cargoCode alanından da okur', () => {
    render({
      shipment: { provider: 'surat', trackingNumber: 'PKG-CMRGW9D6ZH', cargoCode: '11079211193731' },
    });

    expect(screen.getByText(/11079211193731/)).toBeOnTheScreen();
  });

  it('iptal edilen siparişte kargo satırı hiç çizilmez', () => {
    render({
      status: 'cancelled',
      cargoCode: '79174212154116',
      shipment: { provider: 'surat', trackingNumber: 'PKG-CMRGW9D6ZH', cargoCode: '79174212154116' },
    });

    expect(screen.queryByTestId('group-tracking-text')).toBeNull();
  });
});
