/**
 * Profil > Hesabı Sil artık tek dokunuşla silmez: yazarak onaylanan ayrı ekrana gider
 * (`settings/delete-account`, web `DangerZoneSection` eşi). Silme API'si burada çağrılmaz.
 */
import { act, renderHook } from '@testing-library/react-native';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('@/ui', () => ({ toast: jest.fn(), appAlert: jest.fn() }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: { logout: () => Promise<void> }) => unknown) => {
    const state = { logout: jest.fn(() => Promise.resolve()) };
    return sel ? sel(state) : state;
  },
}));

import { useProfileActions } from '../useProfileActions';

beforeEach(() => resetRouterMocks());

it('hesap silme satırı onay ekranını açar', () => {
  const { result } = renderHook(() => useProfileActions());
  act(() => result.current.handleDeleteAccount());
  expect(pushMock).toHaveBeenCalledWith('/settings/delete-account');
});
