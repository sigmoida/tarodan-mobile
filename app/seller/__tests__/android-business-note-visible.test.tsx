/**
 * Bulgu A eşi · Android/web davranışı DEĞİŞMEMELİ — kurumsal hesabı olan ama
 * Business kademesinde olmayan kullanıcı orijinal "üyeliğini tamamla" notunu
 * ve geçiş butonunu görmeye devam eder. iOS tarafı: ios-business-note-neutral.test.tsx.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
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

describe('Android · seller/register kurumsal hesap notu ve geçiş butonu görünür', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = {
      isAuthenticated: true,
      user: { companyName: 'Acme A.Ş.', taxId: '1234567890', membershipTier: 'free' },
    };
  });

  it('orijinal "üyeliğini tamamla" notunu gösterir', () => {
    renderWithProviders(<SellerRegisterScreen />);
    expect(screen.getByText(/seller\.completeBusinessMembershipNote/)).toBeOnTheScreen();
    expect(screen.queryByText(/seller\.businessAccountDetailsRecordedNote/)).toBeNull();
  });

  it('"Business Üyeliğe Geç" butonu görünür', () => {
    renderWithProviders(<SellerRegisterScreen />);
    expect(screen.getByText('seller.switchToBusinessMembership')).toBeOnTheScreen();
  });
});
