import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Sensitive screen protection: screenshots / recordings and the app switcher preview.
 *
 * Card entry + 3DS, 2FA setup (secret, QR, backup codes), IBAN / bank account and TCKN entry
 * turn this on. Platform behaviour (`expo-screen-capture`):
 *  - Android: `FLAG_SECURE`: screenshots and recordings are black, the recents preview is blank.
 *  - iOS: content is hidden in screenshots and recordings; the app switcher preview is blurred
 *    separately (`enableAppSwitcherProtectionAsync`, global on iOS, so it follows the same count
 *    and is active only while a protected screen is open).
 *
 * ONE NATIVE LOCK. The iOS `preventScreenCapture` is not re-entrant: each call reparents the key
 * window's layer into a new secure UITextField and overwrites the only strong reference to the
 * previous one. A second call while locked takes the window out of the layer tree and the whole
 * screen goes black. The library only guards per key, so screens overlapping with their own keys
 * (bank account + identity gate, card form + identity gate) reach native twice. Hence one fixed
 * key and our own count: native prevent runs once, however many screens are protected.
 *
 * The module loads LAZILY: without the native module (Expo Go, an old binary without it, tests)
 * `requireNativeModule` throws at import, so protection is silently off and the screen keeps
 * working. No call here ever throws.
 */

type ScreenCaptureModule = typeof import('expo-screen-capture');

let cached: ScreenCaptureModule | null | undefined;

function screenCaptureModule(): ScreenCaptureModule | null {
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      cached = require('expo-screen-capture') as ScreenCaptureModule;
    } catch {
      cached = null;
    }
  }
  return cached;
}

/** The only key passed to the library: its tag set never holds more than this one entry. */
const NATIVE_LOCK_KEY = 'sensitive-screen';
/** Screens currently protected. */
let holders = 0;
/** Whether the native lock (and the iOS blur) is in effect, as last asked for. */
let nativeLockHeld = false;
/** iOS blur intensity (0-1): the highest, so sensitive data can't be read. */
const APP_SWITCHER_BLUR = 1;

const ignore = () => undefined;

/** Runs one native call; a missing or incompatible module means no protection, never a throw. */
function quietly(call: () => Promise<void>): void {
  try {
    call().catch(ignore);
  } catch {
    /* the screen keeps working */
  }
}

/** Brings the native lock and blur in line with the count; calls native only on a change. */
function syncNativeLock(sc: ScreenCaptureModule): void {
  const wanted = holders > 0;
  if (wanted === nativeLockHeld) return;
  nativeLockHeld = wanted;
  const ios = Platform.OS === 'ios';
  if (wanted) {
    quietly(() => sc.preventScreenCaptureAsync(NATIVE_LOCK_KEY));
    if (ios) quietly(() => sc.enableAppSwitcherProtectionAsync(APP_SWITCHER_BLUR));
  } else {
    quietly(() => sc.allowScreenCaptureAsync(NATIVE_LOCK_KEY));
    if (ios) quietly(() => sc.disableAppSwitcherProtectionAsync());
  }
}

/**
 * Turns protection on; the returned function turns it off (calling it again is harmless). Several
 * protected screens can be open at once: capture is allowed again only when all have closed.
 *
 * Acquiring locks at once. The last release waits for a microtask: React runs a commit's effect
 * cleanups before its new effects, so a protected screen replacing another (or the gate remounting
 * by key) would otherwise drop FLAG_SECURE, the iOS lock and a showing blur for a moment. Within
 * one commit the count returns to 1 first and native is not called at all. A handover across
 * commits does unlock in between; native runs calls in order, so allow then prevent is safe.
 */
export function protectSensitiveScreen(): () => void {
  const sc = screenCaptureModule();
  if (!sc) return ignore;
  holders += 1;
  syncNativeLock(sc);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders === 0) queueMicrotask(() => syncNativeLock(sc));
  };
}

/**
 * Keeps sensitive screen protection on while the component is mounted (and `enabled`). Call it at
 * the root of the screen, BEFORE any early `return`.
 */
export function useScreenCaptureProtection(enabled: boolean = true): void {
  useEffect(() => (enabled ? protectSensitiveScreen() : undefined), [enabled]);
}

/** Tests only: resets the module cache and the count. */
export function __resetScreenCaptureProtection(): void {
  cached = undefined;
  holders = 0;
  nativeLockHeld = false;
}
