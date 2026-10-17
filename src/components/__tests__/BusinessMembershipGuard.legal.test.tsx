/**
 * B2 inceleme 1 · Onay kapısındaki kurumsal hesap belgeyi okuyabilmeli.
 * Kapı belge adına dokununca `/terms`, `/privacy`… açar; guard bu yolları
 * `/membership` ya da `/business-pending`e atarsa üye onaylaması istenen
 * metni hiç göremez. Yasal metin yolları (`isLegalTextPath`) muaftır.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// Android: üyelik satın alınabilen platformda /membership kilidi de devrede.
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));

const mockReplace = jest.fn();
let mockPath = '/';
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
  usePathname: () => mockPath,
}));

type GuardState = { isAuthenticated: boolean; user: Record<string, unknown> };
let mockUser: Record<string, unknown>;
jest.mock('../../stores/authStore', () => ({
  useAuthStore: (sel?: (s: GuardState) => unknown) => {
    const state: GuardState = { isAuthenticated: true, user: mockUser };
    return sel ? sel(state) : state;
  },
}));

import BusinessMembershipGuard from '../BusinessMembershipGuard';

const business = { companyName: 'Acme', taxId: '1234567890' };
const STATUSES = [
  ['pending', '/business-pending'],
  ['rejected', '/business-rejected'],
  ['approved', '/membership'],
] as const;

describe('BusinessMembershipGuard · yasal metin muafiyeti', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  describe.each(STATUSES)('başvuru %s', (businessStatus, target) => {
    beforeEach(() => {
      mockUser = { ...business, businessStatus, membershipTier: 'free' };
    });

    it.each(['/terms', '/privacy', '/distance-sales', '/cookies', '/seller-agreement', '/refund-policy'])(
      '%s açıkken yönlendirmez (onaylanacak metin okunabilir)',
      (path) => {
        mockPath = path;
        render(<BusinessMembershipGuard />);
        expect(mockReplace).not.toHaveBeenCalled();
      },
    );

    it(`yasal metin dışındaki yolda yine ${target}e yönlendirir`, () => {
      mockPath = '/';
      render(<BusinessMembershipGuard />);
      expect(mockReplace).toHaveBeenCalledWith(target);
    });
  });
});
