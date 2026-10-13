/**
 * Plan kartları (Dalga 4b · Paket D) — web telefon düzeni: dikey, tam genişlik (yatay şerit yok);
 * tek rozet yuvası (mevcut > popüler); düğme etiketleri web anahtarlarıyla; alt plan uyarısı korunur.
 * Satın alma kapıları diğer süitlerde kilitli.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { screen, waitFor, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks, pushMock } from '@/test-utils/router-mock';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

let mockAuthState: any = { isAuthenticated: true, user: {} };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuthState;
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  membershipApi: { getCurrentMembership: jest.fn(), getTiers: jest.fn() },
}));
import { membershipApi } from '@/lib/api';
import MembershipScreen from '../index';

const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;
const mockGetTiers = membershipApi.getTiers as jest.Mock;

const withTier = (type: string) =>
  mockGetMembership.mockResolvedValue({ data: { tier: { type, name: type } } });

describe('Üyelik plan kartları (web paritesi)', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    withTier('free');
    mockGetTiers.mockResolvedValue({ data: [] });
  });

  it('kartlar dikey liste: yatay kaydırma şeridi yok', async () => {
    renderWithProviders(<MembershipScreen />);
    await waitFor(() => expect(screen.getByText('membership.basic')).toBeOnTheScreen());
    const horizontal = screen.UNSAFE_getAllByType(ScrollView).filter((s) => s.props.horizontal);
    expect(horizontal).toHaveLength(0);
  });

  it('ücretsiz kullanıcı: premium kartında "en popüler" rozeti, düğmeler "Devam Et"', async () => {
    renderWithProviders(<MembershipScreen />);
    await waitFor(() => expect(screen.getByText('membership.premium')).toBeOnTheScreen());
    expect(screen.getByText('membership.mostPopular')).toBeOnTheScreen();
    // basic + premium
    expect(screen.getAllByText('common.continue')).toHaveLength(2);
  });

  it('premium mevcutken tek rozet yuvası: "en popüler" görünmez, mevcut düğme etiketi var', async () => {
    withTier('premium');
    renderWithProviders(<MembershipScreen />);
    // özet kartı + plan kartı adı
    await waitFor(() => expect(screen.getAllByText('membership.premium')).toHaveLength(2));
    expect(screen.queryByText('membership.mostPopular')).toBeNull();
    // Mevcut kartta rozet + düğme aynı durumu iki kez yazmaz.
    expect(screen.queryByText('membership.currentPlanBadge')).toBeNull();
    // özet kartı başlığı + mevcut kart düğmesi
    expect(screen.getAllByText('membership.currentPlan')).toHaveLength(2);
  });

  it('alt plana geçiş: checkout açılmaz (uyarı yolu korunur)', async () => {
    withTier('premium');
    renderWithProviders(<MembershipScreen />);
    await waitFor(() => expect(screen.getByText('membership.basic')).toBeOnTheScreen());
    // Premium mevcut; yalnız basic kartı "Devam Et" taşır.
    fireEvent.press(screen.getByText('common.continue'));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('bekleyen ödeme bandı erişilebilirlik ipucu taşır', async () => {
    mockGetMembership.mockResolvedValue({
      data: {
        tier: { type: 'free', name: 'Ücretsiz' },
        pendingPayment: { id: 'p1', tierType: 'premium', tierName: 'Premium' },
      },
    });
    renderWithProviders(<MembershipScreen />);
    const subtitle = await screen.findByText('membership.pendingPaymentSubtitle');
    expect(subtitle).toBeOnTheScreen();
    expect(screen.getByAccessibilityHint('order.completePayment')).toBeOnTheScreen();
  });
});
