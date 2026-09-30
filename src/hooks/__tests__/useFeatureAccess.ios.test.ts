/**
 * iOS'ta ücretli özellik satın alınamaz (CAN_BUY_DIGITAL=false). Takas ve
 * koleksiyon yetkisi olmayan kullanıcıya bu özelliklerin GİRİŞİ gösterilmez —
 * gösterilirse "Bu özellik hesabınızda kullanılamıyor" çıkmazına ya da
 * sunucunun "Üyeliğinizi yükseltin" mesajına düşüyordu (Apple 2.1 + 3.1.1).
 * Misafire giriş gösterilir: giriş kapısı ilgili ekranda.
 */
import { renderHook } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: false }));

let mockState: any;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => (sel ? sel(mockState) : mockState),
}));

import { useFeatureAccess } from '../useFeatureAccess';

describe('useFeatureAccess (iOS)', () => {
  it('ücretsiz üye: takas ve koleksiyon girişi yok', () => {
    mockState = { isAuthenticated: true, user: { membershipTier: 'free' }, limits: { canTrade: false, canCreateCollections: false } };
    const { result } = renderHook(() => useFeatureAccess());
    expect(result.current.showTradeEntry).toBe(false);
    expect(result.current.showCollectionEntry).toBe(false);
  });

  it('yetkili üye: girişler görünür', () => {
    mockState = { isAuthenticated: true, user: { membershipTier: 'premium' }, limits: { canTrade: true, canCreateCollections: true } };
    const { result } = renderHook(() => useFeatureAccess());
    expect(result.current.showTradeEntry).toBe(true);
    expect(result.current.showCollectionEntry).toBe(true);
  });

  it('misafir: girişler görünür (giriş kapısı ekranda)', () => {
    mockState = { isAuthenticated: false, user: null, limits: null };
    const { result } = renderHook(() => useFeatureAccess());
    expect(result.current.showTradeEntry).toBe(true);
    expect(result.current.showCollectionEntry).toBe(true);
  });

  it('limits yüklenmemişse takas kademeden türetilir (web trades/new ile aynı)', () => {
    mockState = { isAuthenticated: true, user: { membershipTier: 'basic' }, limits: null };
    const { result } = renderHook(() => useFeatureAccess());
    expect(result.current.canTrade).toBe(true);
  });
});
