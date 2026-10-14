/**
 * "Aboneliğim" + "Üyelik Planı" birleşti: abonelik durumu / dönem / sonraki ödeme ya da bitiş /
 * kalan gün artık Üyelik Planı ekranının "Mevcut Plan" kartında. Mobilde SALT GÖRÜNTÜLEME —
 * iptal, yeniden etkinleştir, plan değiştir, yükselt düğmesi yok (App Store / Play kuralları).
 * Eski `/settings/subscription` yolu `/membership`'e yönlenir.
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
}));

jest.mock('expo-router', () => {
  const rm = require('@/test-utils/router-mock').routerMock;
  const { Text } = require('react-native');
  return { ...rm, Redirect: ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text> };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: { count?: number }) => (o?.count != null ? `${k}:${o.count}` : k) }),
}));

let mockAuthState: any = { isAuthenticated: true, user: {} };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => (sel ? sel(mockAuthState) : mockAuthState),
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  membershipApi: {
    getCurrentMembership: jest.fn(),
    getTiers: jest.fn(),
    cancel: jest.fn(),
    setAutoRenew: jest.fn(),
  },
}));
import { membershipApi } from '@/lib/api';
const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;
const mockGetTiers = membershipApi.getTiers as jest.Mock;

import MembershipScreen from '../index';
import SubscriptionRedirect from '../../settings/subscription/index';

const DAY = 86400000;
const premium = (over: Record<string, unknown> = {}) => ({
  tier: { type: 'premium', name: 'Premium' },
  status: 'active',
  billingPeriod: 'monthly',
  currentPeriodEnd: new Date(Date.now() + 10 * DAY).toISOString(),
  pendingPayment: null,
  ...over,
});

const ACTION_KEYS = [
  'membership.cancelTitle',
  'membership.reactivateSubscriptionTitle',
  'membership.changePlan',
  'membership.upgradeToPremium',
  'membership.manageMembershipHint',
];

describe('Üyelik Planı — abonelik özeti (salt görüntüleme)', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    mockGetTiers.mockResolvedValue({ data: [] });
  });

  it('aktif premium: durum çipi, dönem, sonraki ödeme ve kalan gün; eylem düğmesi yok', async () => {
    mockGetMembership.mockResolvedValue({ data: premium() });
    renderWithProviders(<MembershipScreen />);
    expect(await screen.findByTestId('membership-subscription-details')).toBeTruthy();
    expect(screen.getByText('common.active')).toBeTruthy();
    expect(screen.getByText('membership.monthly')).toBeTruthy();
    expect(screen.getByText('membership.nextPaymentLabel')).toBeTruthy();
    expect(screen.getByText('membership.daysCount:10')).toBeTruthy();
    for (const key of ACTION_KEYS) expect(screen.queryByText(key)).toBeNull();
    expect(membershipApi.cancel).not.toHaveBeenCalled();
  });

  it('iptal edilmiş (dönem içi): "bitiş" etiketi + bitiş uyarısı; yeniden etkinleştir yok', async () => {
    mockGetMembership.mockResolvedValue({ data: premium({ status: 'cancelled' }) });
    renderWithProviders(<MembershipScreen />);
    expect(await screen.findByTestId('membership-expiring-warning')).toBeTruthy();
    expect(screen.getByText('membership.endDateLabel')).toBeTruthy();
    expect(screen.getByText('common.cancelled')).toBeTruthy();
    for (const key of ACTION_KEYS) expect(screen.queryByText(key)).toBeNull();
  });

  it('ücretsiz (aktif ~100 yıllık kayıt) premium gibi gösterilmez: özet ve uyarı yok', async () => {
    mockGetMembership.mockResolvedValue({
      data: premium({ tier: { type: 'free', name: 'Ücretsiz' }, currentPeriodEnd: new Date(Date.now() + 365 * DAY).toISOString() }),
    });
    renderWithProviders(<MembershipScreen />);
    expect(await screen.findByText('membership.free')).toBeTruthy();
    expect(screen.queryByTestId('membership-subscription-details')).toBeNull();
    expect(screen.queryByTestId('membership-status')).toBeNull();
  });

  it('eski /settings/subscription yolu /membership ekranına yönlenir', () => {
    renderWithProviders(<SubscriptionRedirect />);
    expect(screen.getByText('redirect:/membership')).toBeTruthy();
  });

  it('kart dokunulabilir eylem içermez (salt görüntüleme)', async () => {
    mockGetMembership.mockResolvedValue({ data: premium() });
    renderWithProviders(<MembershipScreen />);
    const details = await screen.findByTestId('membership-subscription-details');
    fireEvent.press(details);
    expect(membershipApi.setAutoRenew).not.toHaveBeenCalled();
  });
});
