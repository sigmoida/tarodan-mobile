/**
 * Loading-indicator helpers for screen tests.
 *
 * `useDelayedLoading` (behind `PageShell`'s `loading`) starts a `theme.loading.delayMs` timer
 * while loading. When the JS thread is busy (a loaded test machine, parallel workers), that timer
 * can fire after the screen has already committed its content but before React runs the passive
 * effect that clears it: the skeleton then comes back for `theme.loading.minVisibleMs` over
 * content the test has just found, and the next `getBy*` or press misses. A screen test that
 * asserts what the screen shows once loaded, not the indicator timing, pins the indicator to
 * `loading` itself:
 *
 *   jest.mock('@/ui/loading/useDelayedLoading', () =>
 *     require('@/test-utils/loading').immediateLoadingMock);
 *
 * The timing itself is pinned by `src/ui/loading/__tests__/useDelayedLoading.test.tsx` and
 * `src/ui/components/__tests__/PageShell.test.tsx`, which do not use this mock.
 */
export const immediateLoadingMock = {
  useDelayedLoading: (isLoading: boolean) => isLoading,
};
