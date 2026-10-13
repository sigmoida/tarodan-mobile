/**
 * expo-router mock'u. Test dosyasında:
 *   jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
 * sonra: import { pushMock } from '...'; expect(pushMock).toHaveBeenCalledWith('/checkout');
 * beforeEach içinde resetRouterMocks() çağır.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';

export const pushMock = jest.fn();
export const replaceMock = jest.fn();
export const backMock = jest.fn();
export const canGoBackMock = jest.fn(() => false);

/**
 * `useNavigation()` + `usePreventRemove` eşleri (react-navigation 7). Gerçek
 * `usePreventRemove` navigator dışında atar; `jest.setup.ts` onu `usePreventRemoveMock`
 * ile değiştirir. Test: `emitBeforeRemove()` ekrandan çıkışı (geri oku / iOS kaydırma /
 * Android geri tuşu) taklit eder; dönen `{ prevented, action }` korumanın davranışını verir,
 * engellendiyse kancanın geri çağrısı `{ data: { action } }` ile çalışır.
 */
type PreventEntry = {
  prevent: boolean;
  callback: (options: { data: { action: unknown } }) => void;
};
const preventEntries = new Set<{ current: PreventEntry }>();
export const navigationDispatchMock = jest.fn();
export const navigationMock = {
  addListener: jest.fn(() => () => undefined),
  dispatch: navigationDispatchMock,
  goBack: backMock,
  canGoBack: canGoBackMock,
};

/** `usePreventRemove` eşi: son render'ın değerleri (gerçekte insertion effect) kayıtlı. */
export function usePreventRemoveMock(prevent: boolean, callback: PreventEntry['callback']) {
  const entry = useRef<PreventEntry>({ prevent, callback });
  useLayoutEffect(() => {
    entry.current = { prevent, callback };
  });
  useEffect(() => {
    preventEntries.add(entry);
    return () => {
      preventEntries.delete(entry);
    };
  }, []);
}

export function emitBeforeRemove(action: unknown = { type: 'GO_BACK' }) {
  let prevented = false;
  preventEntries.forEach(({ current }) => {
    if (!current.prevent) return;
    prevented = true;
    current.callback({ data: { action } });
  });
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
