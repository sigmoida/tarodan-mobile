/**
 * `usePreventRemove` (@react-navigation/native) test eşi. Test dosyasında:
 *   jest.mock('@react-navigation/native', () => require('@/test-utils/preventRemove').navigationNativeMock);
 *   jest.mock('expo-router', () => ({ ...routerMock, useNavigation: () => require('@/test-utils/preventRemove').navigationStub }));
 * `emitRemove()` ekrandan çıkışı (geri oku / iOS kaydırma / Android geri) taklit eder: ekran
 * engelliyorsa geri çağırımı çalıştırır ve `{ prevented: true }` döner; bekletilen eylem
 * `preventRemoveDispatchMock` ile gönderilir. `beforeEach` içinde `resetPreventRemove()`.
 */
type PreventRemoveCallback = (e: { data: { action: unknown } }) => void;

const state: { prevent: boolean; callback: PreventRemoveCallback | null } = { prevent: false, callback: null };

export const preventRemoveDispatchMock = jest.fn();
export const navigationStub = { dispatch: preventRemoveDispatchMock };

export const navigationNativeMock = {
  ...jest.requireActual('@react-navigation/native'),
  usePreventRemove: (prevent: boolean, callback: PreventRemoveCallback) => {
    state.prevent = prevent;
    state.callback = callback;
  },
};

export function emitRemove(action: unknown = { type: 'GO_BACK' }) {
  if (!state.prevent || !state.callback) return { prevented: false, action };
  state.callback({ data: { action } });
  return { prevented: true, action };
}

export function resetPreventRemove() {
  state.prevent = false;
  state.callback = null;
  preventRemoveDispatchMock.mockClear();
}
