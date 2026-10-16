/**
 * M1 — bayat görüntüyle kapıya kilitlenen kurumsal hesap, doğrulama `approved`
 * getirince kapıda mahsur kalmamalı (`gestureEnabled:false`). Kapı ekranı koşulu
 * artık geçerli değilse ana sayfaya döner; çıkış sürerken / üstüne açılmış başvuru
 * formu varken dokunmaz.
 */
import { renderHook } from '@testing-library/react-native';

const mockNavigateTo = jest.fn();
jest.mock('@/lib/navigation/goTo', () => ({
  navigateTo: (...a: unknown[]) => mockNavigateTo(...a),
}));

let mockPath = '/business-pending';
jest.mock('expo-router', () => ({
  usePathname: () => mockPath,
}));

type State = { isAuthenticated: boolean; user: Record<string, unknown> | null };
let mockState: State;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: State) => unknown) => sel(mockState),
}));

import { useBusinessGateExit } from '../useBusinessGateExit';

const business = (businessStatus: string) => ({ companyName: 'Acme', taxId: '1234567890', businessStatus });

beforeEach(() => {
  mockNavigateTo.mockClear();
  mockPath = '/business-pending';
});

describe('useBusinessGateExit', () => {
  it('başvuru hâlâ beklemedeyse kapıda kalınır', () => {
    mockState = { isAuthenticated: true, user: business('pending') };
    renderHook(() => useBusinessGateExit('pending'));
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('bayat görüntü → doğrulama approved getirdi: ana sayfaya dönülür', () => {
    mockState = { isAuthenticated: true, user: business('pending') };
    const { rerender } = renderHook(() => useBusinessGateExit('pending'));
    expect(mockNavigateTo).not.toHaveBeenCalled();

    mockState = { isAuthenticated: true, user: business('approved') };
    rerender({});
    expect(mockNavigateTo).toHaveBeenCalledWith('/');
  });

  it('reddedilmiş kapı: durum değişince çıkılır', () => {
    mockPath = '/business-rejected';
    mockState = { isAuthenticated: true, user: business('approved') };
    renderHook(() => useBusinessGateExit('rejected'));
    expect(mockNavigateTo).toHaveBeenCalledWith('/');
  });

  it('kurumsal olmayan hesap kapıda tutulmaz', () => {
    mockState = { isAuthenticated: true, user: { businessStatus: 'pending' } };
    renderHook(() => useBusinessGateExit('pending'));
    expect(mockNavigateTo).toHaveBeenCalledWith('/');
  });

  it('oturum yokken (çıkış) yönlendirmez — login yönlendirmesiyle yarışmaz', () => {
    mockState = { isAuthenticated: false, user: null };
    renderHook(() => useBusinessGateExit('pending'));
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('kapının üstünde başvuru formu açıkken dokunmaz', () => {
    mockPath = '/settings/business-application';
    mockState = { isAuthenticated: true, user: business('approved') };
    renderHook(() => useBusinessGateExit('pending'));
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});
