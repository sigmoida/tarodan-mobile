/**
 * Platform Hizmet Bedeli şeffaflık sayfası.
 * Canlı ölçüm (staging): buyerFeeRate = 10, serviceVatRate = 20, ve
 * buyerServiceTaxAmount 22.4 = %20 × (hizmet bedeli 62 + kargo 50). Sayfa "%3",
 * "500 TL → 15 TL" ve "ayrıca KDV eklenmez" diyordu — üçü de yanlış. Sayfada
 * canlı oran gösterilemiyor (public uç {} dönüyor; oran yalnız sepet quote'unda),
 * bu yüzden sabit sayı yazmak yerine kullanıcı ödeme özetine yönlendirilir.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

import PlatformHizmetBedeliScreen from '../platform-hizmet-bedeli';

describe('platform-hizmet-bedeli transparency copy', () => {
  it('does not state a hardcoded fee rate', () => {
    renderWithProviders(<PlatformHizmetBedeliScreen />);
    expect(screen.queryByText(/%\d/)).toBeNull();
  });

  it('does not state the wrong 15 TL worked example', () => {
    renderWithProviders(<PlatformHizmetBedeliScreen />);
    expect(screen.queryByText(/15 TL/)).toBeNull();
  });

  it('no longer claims VAT is included rather than added', () => {
    renderWithProviders(<PlatformHizmetBedeliScreen />);
    expect(screen.queryByText(/ayrıca KDV eklenmez/)).toBeNull();
  });

  it('explains that the service VAT also covers the shipping share', () => {
    renderWithProviders(<PlatformHizmetBedeliScreen />);
    expect(screen.getByText(/KDV[^]*kargo|kargo[^]*KDV/i)).toBeTruthy();
  });
});
