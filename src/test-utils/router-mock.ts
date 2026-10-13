/**
 * expo-router mock'u. Test dosyasında:
 *   jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
 * sonra: import { pushMock } from '...'; expect(pushMock).toHaveBeenCalledWith('/checkout');
 * beforeEach içinde resetRouterMocks() çağır.
 */
import { useEffect } from 'react';

export const pushMock = jest.fn();
export const replaceMock = jest.fn();
export const backMock = jest.fn();
export const canGoBackMock = jest.fn(() => false);

/**
 * `useNavigation()` eşi — `beforeRemove` gibi olay dinleyicilerini kaydeder.
 * Test: `emitBeforeRemove()` ekrandan çıkışı (geri oku / Android geri tuşu)
 * taklit eder; dönen `{ prevented, action }` ile korumanın davrandığı doğrulanır.
 */
type NavEvent = { data: { action: unknown }; preventDefault: () => void };
type NavListener = (e: NavEvent) => void;
const navListeners: Record<string, Set<NavListener>> = {};
export const navigationDispatchMock = jest.fn();
export const navigationMock = {
  addListener: jest.fn((event: string, cb: NavListener) => {
    (navListeners[event] ??= new Set()).add(cb);
    return () => navListeners[event]?.delete(cb);
  }),
  dispatch: navigationDispatchMock,
  goBack: backMock,
  canGoBack: canGoBackMock,
};
export function emitBeforeRemove(action: unknown = { type: 'GO_BACK' }) {
  let prevented = false;
  const e: NavEvent = {
    data: { action },
    preventDefault: () => {
      prevented = true;
    },
  };
  navListeners.beforeRemove?.forEach((cb) => cb(e));
  return { prevented, action };
}

export const routerMock = {
  router: {
    push: pushMock,
    replace: replaceMock,
    back: backMock,
    canGoBack: canGoBackMock,
  },
  useLocalSearchParams: () => ({}),
  useRouter: () => routerMock.router,
  useNavigation: () => navigationMock,
  // Test ortamında focus'u mount ile eşitle: callback bir kez çalışır, cleanup desteklenir.
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => cb(), []);
  },
};

export function resetRouterMocks() {
  pushMock.mockClear();
  replaceMock.mockClear();
  backMock.mockClear();
  navigationDispatchMock.mockClear();
  canGoBackMock.mockReset();
  canGoBackMock.mockReturnValue(false);
}
