/**
 * Contract fixtures for the seller trust score (tarodan-ops
 * `contracts/deltas/2026-10-21-seller-trust-score.md`).
 *
 * The bodies below are copied from the delta (the read path is not on staging yet, so they are
 * not measured). The test pins: the vendored constants match the delta, every level has a label
 * in both catalogs, and a `GET /users/:id/profile` body goes through the real seller query
 * (`useSellerProfile`, envelope unwrap included) to the badge: scored, `new`, `null` (gated),
 * key absent (an API without the block) and an unknown future level. The deprecated
 * `trustScore` / `trustLevel` stay in every body and are never shown.
 */
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));
jest.mock('@/stores/authStore', () => {
  const { create } = jest.requireActual<typeof import('zustand')>('zustand');
  return { useAuthStore: create(() => ({ isAuthenticated: false, user: null, token: null, logout: jest.fn() })) };
});
jest.mock('@/hooks/useFollowing', () => ({
  useFollowing: () => ({ isFollowing: () => false, followSeller: jest.fn(), unfollowSeller: jest.fn() }),
}));

import React from 'react';
import { View } from 'react-native';
import type { InternalAxiosRequestConfig } from 'axios';
import { screen } from '@testing-library/react-native';
import { renderWithProviders as render } from '@/test-utils';
import i18n from '@/i18n/config';
import { api } from '@/lib/api/client';
import {
  SELLER_TRUST_FORMULA_VERSION,
  SELLER_TRUST_LEVELS,
  SELLER_TRUST_LEVEL_I18N_KEYS,
  SELLER_TRUST_LEVEL_MIN_X100,
  SELLER_TRUST_MIN_COUNTERPARTIES,
  SELLER_TRUST_MIN_TRANSACTIONS,
  formatTrustRating,
  sellerTrustLevel,
} from '@/types/seller-trust';
import tr from '@/i18n/lib/catalog/tr.json';
import en from '@/i18n/lib/catalog/en.json';

import { useSellerProfile } from '../_hooks/useSellerProfile';
import { SellerTrustBadge } from '../_components/SellerTrustBadge';

/** `GET /users/:id/profile` (delta, Changes): premium seller, deprecated fields still sent. */
const profile = (trust: unknown, legacy: { trustScore: number | null; trustLevel: string | null }) => ({
  id: 's1',
  displayName: 'Ali Veli',
  isPremium: true,
  ...legacy,
  ...(trust === undefined ? {} : { trust }),
});

const SCORED = profile({ rating: 3.74, level: 'fair', formulaVersion: 1 }, { trustScore: 75, trustLevel: 'Orta' });
const NEW_SELLER = profile({ rating: null, level: 'new', formulaVersion: 1 }, { trustScore: null, trustLevel: null });
const GATED = { ...profile(null, { trustScore: null, trustLevel: null }), isPremium: false };
const NO_BLOCK = profile(undefined, { trustScore: 75, trustLevel: 'Orta' });
const FUTURE_LEVEL = profile({ rating: 4.9, level: 'legendary', formulaVersion: 2 }, { trustScore: 98, trustLevel: 'Çok Güvenilir' });

let profileBody: unknown = {};

beforeEach(async () => {
  await i18n.changeLanguage('tr');
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    // The API answers in the `{ data }` envelope; the hook unwraps it.
    const data = config.url === '/users/s1/profile' ? { data: profileBody } : {};
    return { status: 200, data, headers: {}, config, statusText: '' };
  };
});

function Harness() {
  const f = useSellerProfile();
  if (!f.seller) return null;
  return (
    <View testID="seller-loaded">
      <SellerTrustBadge trust={f.seller.trust} />
    </View>
  );
}

describe('vendored constants match the delta', () => {
  it('levels, thresholds, minimums and formula version', () => {
    expect(SELLER_TRUST_LEVELS).toEqual(['excellent', 'trusted', 'fair', 'developing', 'new']);
    expect(SELLER_TRUST_LEVEL_MIN_X100).toEqual({ excellent: 450, trusted: 400, fair: 300 });
    expect(SELLER_TRUST_MIN_TRANSACTIONS).toBe(5);
    expect(SELLER_TRUST_MIN_COUNTERPARTIES).toBe(3);
    expect(SELLER_TRUST_FORMULA_VERSION).toBe(1);
    expect([null, 449, 450, 399, 400, 299, 300].map(sellerTrustLevel)).toEqual([
      'new',
      'trusted',
      'excellent',
      'fair',
      'trusted',
      'developing',
      'fair',
    ]);
  });

  it('two decimals in the active language', () => {
    expect(formatTrustRating(4.37, 'tr')).toBe('4,37');
    expect(formatTrustRating(4, 'en')).toBe('4.00');
  });

  it('every level label exists in tr and en', () => {
    const lookup = (catalog: Record<string, unknown>, key: string) =>
      key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalog);
    for (const key of Object.values(SELLER_TRUST_LEVEL_I18N_KEYS)) {
      expect(typeof lookup(tr, key)).toBe('string');
      expect(typeof lookup(en, key)).toBe('string');
    }
  });
});

describe('GET /users/:id/profile -> seller badge', () => {
  it('scored: "Güven skoru 3,74/5 · Orta", never the legacy /100', async () => {
    profileBody = SCORED;
    render(<Harness />);
    expect(await screen.findByText('Güven skoru 3,74/5 · Orta')).toBeTruthy();
    expect(screen.queryByText(/\/100/)).toBeNull();
  });

  it('new: "Güven skoru: Yeni satıcı"', async () => {
    profileBody = NEW_SELLER;
    render(<Harness />);
    expect(await screen.findByText('Güven skoru: Yeni satıcı')).toBeTruthy();
  });

  it.each([
    ['gated (`trust: null`)', GATED],
    ['an API without the block (key absent, legacy fields set)', NO_BLOCK],
    ['an unknown future level', FUTURE_LEVEL],
  ])('%s: no badge', async (_name, body) => {
    profileBody = body;
    render(<Harness />);
    expect(await screen.findByTestId('seller-loaded')).toBeTruthy();
    expect(screen.queryByTestId('seller-trust-badge')).toBeNull();
    expect(screen.queryByText(/\/100/)).toBeNull();
  });
});
