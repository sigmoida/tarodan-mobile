/**
 * Bulgu A · app/seller/register.tsx, kurumsal hesabı olan ama Business
 * kademesinde olmayan kullanıcıya "Business üyeliğinizi tamamlayarak
 * kurumsal avantajları etkinleştirin." notunu gösteriyordu — bu ekran
 * DashboardSections "İşletme Bilgileri" hızlı işleminden, settings/business'tan
 * ve DiscountsGate'ten iOS'ta da erişilebilir. iOS'ta ücretli kademe adı
 * geçmeyen nötr bir not gösterilir.
 *
 * TEKNİK: CAN_BUY_DIGITAL modül seviyesinde mock'lanmalı.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
}));

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

let mockAuthState: any;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuthState;
    return sel ? sel(state) : state;
  },
}));

import SellerRegisterScreen from '../register';

describe('iOS · seller/register kurumsal hesap notu nötr', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = {
      isAuthenticated: true,
      user: { companyName: 'Acme A.Ş.', taxId: '1234567890', membershipTier: 'free' },
    };
  });

  it('Business kademesine davet eden notu değil nötr notu gösterir', () => {
    renderWithProviders(<SellerRegisterScreen />);
    expect(screen.getByText(/seller\.alreadyBusinessAccount/)).toBeOnTheScreen();
    expect(screen.queryByText(/seller\.completeBusinessMembershipNote/)).toBeNull();
    expect(screen.getByText(/seller\.businessAccountDetailsRecordedNote/)).toBeOnTheScreen();
  });

  it('"Business Üyeliğe Geç" butonu (UpgradeCta) gizli', () => {
    renderWithProviders(<SellerRegisterScreen />);
    expect(screen.queryByText('seller.switchToBusinessMembership')).toBeNull();
  });
});

/**
 * Bireysel hesap: ekran ücretli Business kademesinin avantajlarını listeliyordu
 * ("Sınırsız ilan, düşük komisyon", "öncelikli gösterim") — iOS'ta satın
 * alınamayan bir kademeyi pazarlamak (Apple 3.1.1/3.1.3). Ayrı hesap notu ve
 * düğme kalır.
 */
describe('iOS · seller/register bireysel hesap — avantaj listesi yok', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: { membershipTier: 'free' } };
  });

  it('ücretli kademe avantajlarını listelemez, ayrı hesap notu kalır', () => {
    renderWithProviders(<SellerRegisterScreen />);
    expect(screen.queryByText('seller.businessSellerBenefits')).toBeNull();
    expect(screen.queryByText('seller.benefitUnlimitedListings')).toBeNull();
    expect(screen.getByText('seller.businessAccountSeparateNote')).toBeOnTheScreen();
    expect(screen.getByText('seller.openBusinessAccount')).toBeOnTheScreen();
  });
});
