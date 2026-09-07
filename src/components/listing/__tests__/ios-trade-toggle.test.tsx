/**
 * iOS: ilan formunda "Takas Açık" satırı — ücretsiz katmanda (`canTrade: false`)
 * Premium'a Geç oku ve "Premium üye olmanız gerekir" açıklaması Guideline
 * 3.1.1 ihlali (CRITICAL 2, final code review). Android eşi:
 * android-trade-toggle.test.tsx.
 *
 * Gerçek (mock'lanmamış) `react-i18next` kullanılıyor — bu dosya `t`'yi
 * anahtar yankılayan bir mock'a bağlamıyor, `jest.setup.ts`'teki gerçek tr
 * kataloğu devrede. Amaç: `product.upgradeArrow` ("Premium'a Geç →") gibi
 * SERT kodlanmış olmayan ama tier adı taşıyan çevrilmiş metnin de gerçekten
 * kaybolduğunu kanıtlamak — anahtar-yankı mock'u bunu gizler.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { ListingOptionsSection } from '../_components/ListingSections';

const baseF: any = {
  limits: { canTrade: false },
  isTradeEnabled: false,
  setIsTradeEnabled: jest.fn(),
  isSet: false,
  setIsSet: jest.fn(),
  bundleSize: '',
  setBundleSize: jest.fn(),
  isEdit: false,
  isPreorder: false,
  setIsPreorder: jest.fn(),
  status: 'active',
  setStatus: jest.fn(),
};

describe('iOS: ilan formu takas satırı — ücretsiz katman', () => {
  it('yükseltme oku ve tier adı taşıyan açıklama yok; nötr metin görünür', () => {
    render(<ListingOptionsSection f={baseF} />);
    // Nötr kapı metni — hesabın durumu söyleniyor.
    expect(screen.getByText('Bu özellik hesabınızda kullanılamıyor.')).toBeTruthy();
    // Eski, tier adı taşıyan açıklama artık YOK.
    expect(screen.queryByText(/Premium üye/i)).toBeNull();
    // Yükseltme oku (UpgradeCta ile sarılı) render edilmiyor.
    expect(screen.queryByText(/Premium'a Geç/i)).toBeNull();
    expect(screen.queryByText(/Premium/i)).toBeNull();
  });
});
