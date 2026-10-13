/**
 * Plan şeridi düzeni (Dalga 4b · Paket D): kart genişliği ekran genişliğinden türer, şerit
 * kenardan kenara (negatif marj) ve snap aralığı kart + boşluk. Tek kart (kurumsal) tam genişlik.
 * Satın alma kapıları / metinler diğer süitlerde kilitli; burada yalnız yerleşim.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';
import { PAGE_GUTTER } from '@/ui';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

let mockWidth = 360;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 640, scale: 2, fontScale: 1.3 }),
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
import {
  TIER_CARD_GAP,
  TIER_CARD_MAX_WIDTH,
  TIER_CARD_WIDTH_RATIO,
} from '../_lib/membershipStyles';
import MembershipScreen from '../index';

const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;
const mockGetTiers = membershipApi.getTiers as jest.Mock;

function findStrip() {
  const all = screen.UNSAFE_getAllByType(ScrollView);
  const strip = all.find((s) => s.props.horizontal && s.props.snapToInterval);
  if (!strip) throw new Error('plan şeridi bulunamadı');
  return strip;
}

describe('Üyelik plan şeridi yerleşimi', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    mockGetMembership.mockResolvedValue({ data: { tier: { type: 'free', name: 'Ücretsiz' } } });
    mockGetTiers.mockResolvedValue({ data: [] });
  });

  it.each([360, 375, 430])('%ipt: snap aralığı = kart genişliği + boşluk; şerit kenardan kenara', async (w) => {
    mockWidth = w;
    renderWithProviders(<MembershipScreen />);
    await waitFor(() => expect(screen.getByText('membership.basic')).toBeOnTheScreen());
    const strip = findStrip();
    const cardWidth = Math.min(Math.round(w * TIER_CARD_WIDTH_RATIO), TIER_CARD_MAX_WIDTH);
    expect(strip.props.snapToInterval).toBe(cardWidth + TIER_CARD_GAP);
    expect(StyleSheet.flatten(strip.props.style).marginHorizontal).toBe(-PAGE_GUTTER);
    expect(StyleSheet.flatten(strip.props.contentContainerStyle).paddingHorizontal).toBe(PAGE_GUTTER);
  });

  it('kurumsal hesap: tek kart tam genişlik', async () => {
    mockWidth = 375;
    mockAuthState = {
      isAuthenticated: true,
      user: { companyName: 'Acme A.Ş.', taxId: '1234567890' },
    };
    renderWithProviders(<MembershipScreen />);
    await waitFor(() => expect(screen.getByText('membership.business')).toBeOnTheScreen());
    expect(findStrip().props.snapToInterval).toBe(375 - PAGE_GUTTER * 2 + TIER_CARD_GAP);
  });
});
