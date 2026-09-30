/**
 * Onaylı kurumsal hesap Business kademesinde değilse /membership'e kilitleniyordu.
 * iOS'ta o ekranda satın alma yok (CAN_BUY_DIGITAL=false) — hesap uygulamayı
 * kullanamıyor, tek çıkış oturumu kapatmaktı (Apple 2.1 + 3.1.1: uygulama dışı
 * satın alma şartı). iOS'ta kademe yönlendirmesi yapılmaz; bekleyen/reddedilen
 * başvuru yönlendirmeleri aynen kalır.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: false }));

const mockReplace = jest.fn();
let mockPath = '/';
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
  usePathname: () => mockPath,
}));

let mockUser: any;
jest.mock('../../stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => {
    const state: any = { isAuthenticated: true, user: mockUser };
    return sel ? sel(state) : state;
  },
}));

import BusinessMembershipGuard from '../BusinessMembershipGuard';

const business = { companyName: 'Acme', taxId: '1234567890' };

describe('iOS · BusinessMembershipGuard', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPath = '/';
  });

  it('onaylı ama Business kademesinde olmayan hesabı /membership`e kilitlemez', () => {
    mockUser = { ...business, businessStatus: 'approved', membershipTier: 'free' };
    render(<BusinessMembershipGuard />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('bekleyen başvuru yine /business-pending`e gider', () => {
    mockUser = { ...business, businessStatus: 'pending', membershipTier: 'free' };
    render(<BusinessMembershipGuard />);
    expect(mockReplace).toHaveBeenCalledWith('/business-pending');
  });
});
