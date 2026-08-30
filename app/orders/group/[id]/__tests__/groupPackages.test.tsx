/**
 * B10 — satıcı-bazlı paket kırılımı (`GroupPackageCard`).
 *
 * Ölçüm (staging, 2026-08-29, `GET /orders/groups/:id`): `packages[]` her
 * satıcı için `packageNumber`, `shippingCost`, `cargo` taşıyor. `cargo.cargoCode`
 * ölçülen örnekte `null`, `cargo.trackingUrl` ise Tarodan iç referansından
 * (`PKG-…`) kurulu — Sürat bu kodu TANIMAZ. Ekran o alanı hiç okumamalı;
 * link `deriveShipmentView` ile kurulur.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => {
  const rm = require('@/test-utils/router-mock').routerMock;
  return { ...rm, useLocalSearchParams: () => ({ id: 'g1' }) };
});

import { GroupPackageCard } from '../_components/GroupSections';
import type { GroupPackage } from '../_lib/types';

const pkg = (extra: Partial<GroupPackage> = {}): GroupPackage => ({
  id: 'pkg1',
  packageNumber: 'PKG-NKSQYKP256',
  sellerId: 's1',
  seller: { id: 's1', publicName: 'Tarodan Platform Ticaret A.Ş.', displayName: 'Tarodan Platform Ticaret A.Ş.' },
  shippingCost: 50,
  cargo: null,
  ...extra,
});

const render = (extra: Partial<GroupPackage> = {}) =>
  renderWithProviders(<GroupPackageCard pkg={pkg(extra)} />);

describe('paket kartı (GroupPackageCard)', () => {
  it('satıcı adını, teslimat numarasını ve kargo ücretini gösterir', () => {
    render();
    expect(screen.getByText(/Tarodan Platform Ticaret A\.Ş\./)).toBeOnTheScreen();
    expect(screen.getByText('PKG-NKSQYKP256')).toBeOnTheScreen();
    expect(screen.getByText('50,00 TL')).toBeOnTheScreen();
  });

  it('kargo ücretini SUNUCUDAN GELDİĞİ GİBİ basar — yeniden hesaplamaz', () => {
    render({ shippingCost: 33.7 });
    expect(screen.getByText('33,70 TL')).toBeOnTheScreen();
  });

  /**
   * Ölçülen gövdede tam olarak bu durum var: `cargoCode: null`,
   * `trackingUrl` iç referanstan kurulu bozuk bir link. Kart o linki HİÇ
   * okumamalı; gerçek kod yokken "hazırlanıyor" metni gösterilmeli.
   */
  it('gerçek taşıyıcı kodu yokken sunucunun bozuk `trackingUrl`ını KULLANMAZ, hazırlanıyor metni basar', () => {
    render({
      cargo: {
        trackingNumber: 'PKG-NKSQYKP256',
        cargoCode: null,
        provider: 'surat',
        status: 'delivered',
        shippedAt: '2026-08-05T07:21:21.000Z',
        deliveredAt: '2026-08-07T07:21:21.000Z',
      },
    });
    expect(screen.queryByText(/PKG-NKSQYKP256/)).toBeOnTheScreen(); // teslimat no satırı hâlâ var
    expect(screen.getByText('Kargo kodu hazırlanıyor')).toBeOnTheScreen();
    expect(screen.queryByText('Sürat\'ta Takip Et')).toBeNull();
  });

  it('gerçek taşıyıcı kodu geldiğinde takip düğmesini gösterir', () => {
    render({
      cargo: {
        trackingNumber: 'PKG-NKSQYKP256',
        cargoCode: '79174212154116',
        provider: 'surat',
        status: 'delivered',
        shippedAt: '2026-08-05T07:21:21.000Z',
        deliveredAt: '2026-08-07T07:21:21.000Z',
      },
    });
    expect(screen.getByText('79174212154116')).toBeOnTheScreen();
    expect(screen.getByText("Sürat'ta Takip Et")).toBeOnTheScreen();
  });
});
