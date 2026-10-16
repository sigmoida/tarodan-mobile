/**
 * P2: bildirim izni açılışta değil, değer anında kendi sheet'imizle istenir — yalnız
 * sorulabiliyorsa, oturum açıkken, "Şimdi Değil"den sonra bekleme süresi dolunca ve
 * oturumda bir kez.
 */
const mockRead = jest.fn();
jest.mock('@/lib/permissions', () => ({
  ...jest.requireActual('@/lib/permissions/types'),
  readNotificationPermission: () => mockRead(),
}));
const mockStore = new Map<string, string>();
jest.mock('@/lib/storage/lazyAsyncStorage', () => ({
  readStoredValue: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  writeStoredValue: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
}));
let mockAuthed = true;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ isAuthenticated: mockAuthed }) },
}));

import {
  PRE_PROMPT_COOLDOWN_MS,
  PRE_PROMPT_SHOW_DELAY_MS,
  offerNotificationPrompt,
  recordPrePromptDismissed,
  resetPrePromptForTests,
} from '../prePrompt';
import { useNotificationPromptStore } from '@/stores/notificationPromptStore';

async function offer(reason: 'message' | 'offer' | 'order' = 'message') {
  const pending = offerNotificationPrompt(reason);
  await jest.advanceTimersByTimeAsync(PRE_PROMPT_SHOW_DELAY_MS);
  return pending;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockStore.clear();
  mockAuthed = true;
  mockRead.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
  resetPrePromptForTests();
  useNotificationPromptStore.getState().hide();
});
afterEach(() => jest.useRealTimers());

it('sorulabilir izin + oturum → sheet gerekçesiyle açılır', async () => {
  await expect(offer('offer')).resolves.toBe(true);
  expect(useNotificationPromptStore.getState().reason).toBe('offer');
});

it('oturumda yalnız bir kez', async () => {
  await offer();
  useNotificationPromptStore.getState().hide();
  await expect(offer()).resolves.toBe(false);
});

it.each([
  [{ status: 'granted', canAskAgain: false }],
  [{ status: 'denied', canAskAgain: false }],
  [{ status: 'unavailable', canAskAgain: false }],
])('%j → gösterilmez', async (state) => {
  mockRead.mockResolvedValue(state);
  await expect(offer()).resolves.toBe(false);
  expect(useNotificationPromptStore.getState().reason).toBeNull();
});

it('misafir → gösterilmez', async () => {
  mockAuthed = false;
  await expect(offer()).resolves.toBe(false);
});

it('"Şimdi Değil" sonrası bekleme süresi boyunca sorulmaz, sonra sorulur', async () => {
  const now = Date.now();
  await recordPrePromptDismissed(now - 1000);
  await expect(offer()).resolves.toBe(false);

  resetPrePromptForTests();
  await recordPrePromptDismissed(now - PRE_PROMPT_COOLDOWN_MS - 1000);
  await expect(offer()).resolves.toBe(true);
});
