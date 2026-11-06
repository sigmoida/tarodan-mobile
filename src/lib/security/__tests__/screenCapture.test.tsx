/**
 * Sensitive screen protection (`screenCapture.ts`): one native lock however many screens are
 * protected, iOS app switcher blur by counter, silently disabled without the native module.
 */
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';

const mockModule = {
  preventScreenCaptureAsync: jest.fn((_key?: string) => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn((_key?: string) => Promise.resolve()),
  enableAppSwitcherProtectionAsync: jest.fn(() => Promise.resolve()),
  disableAppSwitcherProtectionAsync: jest.fn(() => Promise.resolve()),
};
jest.mock('expo-screen-capture', () => mockModule);

import {
  __resetScreenCaptureProtection,
  protectSensitiveScreen,
  useScreenCaptureProtection,
} from '../screenCapture';

const originalOS = Platform.OS;
const setOS = (os: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
/** The last release hands over to a microtask, so a swap within one commit stays locked. */
const flushRelease = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const prevents = () => mockModule.preventScreenCaptureAsync.mock.calls.length;
const allows = () => mockModule.allowScreenCaptureAsync.mock.calls.length;

beforeEach(() => {
  __resetScreenCaptureProtection();
  jest.clearAllMocks();
});
afterAll(() => setOS(originalOS));

describe.each(['ios', 'android'] as const)('protectSensitiveScreen on %s', (os) => {
  beforeEach(() => setOS(os));

  it('two overlapping protections give one native prevent', () => {
    protectSensitiveScreen();
    protectSensitiveScreen();
    expect(prevents()).toBe(1);
  });

  it('closing the first leaves protection on; closing the last gives one allow', async () => {
    const first = protectSensitiveScreen();
    const last = protectSensitiveScreen();
    first();
    await flushRelease();
    expect(allows()).toBe(0);
    last();
    await flushRelease();
    expect(allows()).toBe(1);
    expect(prevents()).toBe(1);
  });

  it('closes in either order', async () => {
    const first = protectSensitiveScreen();
    const last = protectSensitiveScreen();
    last();
    await flushRelease();
    expect(allows()).toBe(0);
    first();
    await flushRelease();
    expect(allows()).toBe(1);
  });

  it('prevent and allow use the same key, or the library tag set never empties', async () => {
    const release = protectSensitiveScreen();
    release();
    await flushRelease();
    const [preventKey] = mockModule.preventScreenCaptureAsync.mock.calls[0]!;
    const [allowKey] = mockModule.allowScreenCaptureAsync.mock.calls[0]!;
    expect(preventKey).toBeTruthy();
    expect(allowKey).toBe(preventKey);
  });

  it('a double release does not take away the protection of another screen', async () => {
    const first = protectSensitiveScreen();
    const other = protectSensitiveScreen();
    first();
    first();
    await flushRelease();
    expect(allows()).toBe(0);
    other();
    other();
    await flushRelease();
    expect(allows()).toBe(1);
  });

  it('a release then reacquire within one commit keeps the lock with no native call', async () => {
    const outgoing = protectSensitiveScreen();
    outgoing();
    protectSensitiveScreen();
    await flushRelease();
    expect(prevents()).toBe(1);
    expect(allows()).toBe(0);
  });

  it('locks again after a full release, allow first', async () => {
    const order: string[] = [];
    mockModule.preventScreenCaptureAsync.mockImplementationOnce(() => {
      order.push('prevent');
      return Promise.resolve();
    });
    mockModule.allowScreenCaptureAsync.mockImplementationOnce(() => {
      order.push('allow');
      return Promise.resolve();
    });
    mockModule.preventScreenCaptureAsync.mockImplementationOnce(() => {
      order.push('prevent');
      return Promise.resolve();
    });
    protectSensitiveScreen()();
    await flushRelease();
    protectSensitiveScreen();
    expect(order).toEqual(['prevent', 'allow', 'prevent']);
  });

  it('a rejected native call does not throw and does not unbalance the count', async () => {
    mockModule.preventScreenCaptureAsync.mockReturnValueOnce(Promise.reject(new Error('unavailable')));
    mockModule.allowScreenCaptureAsync.mockReturnValueOnce(Promise.reject(new Error('unavailable')));
    const release = protectSensitiveScreen();
    expect(release).not.toThrow();
    await flushRelease();
    protectSensitiveScreen();
    expect(prevents()).toBe(2);
    expect(allows()).toBe(1);
  });

  it('a native call that throws synchronously never reaches the screen', async () => {
    mockModule.preventScreenCaptureAsync.mockImplementationOnce(() => {
      throw new Error('incompatible');
    });
    mockModule.allowScreenCaptureAsync.mockImplementationOnce(() => {
      throw new Error('incompatible');
    });
    const release = protectSensitiveScreen();
    expect(release).not.toThrow();
    // The allow throws inside the microtask: uncaught there, jest would fail this test.
    await flushRelease();
    expect(allows()).toBe(1);
    protectSensitiveScreen();
    expect(prevents()).toBe(2);
  });

  it('every order of three releases gives one allow, only after the last', async () => {
    for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
      jest.clearAllMocks();
      const holds = [protectSensitiveScreen(), protectSensitiveScreen(), protectSensitiveScreen()];
      for (const [step, index] of order.entries()) {
        expect(allows()).toBe(0);
        holds[index!]!();
        await flushRelease();
        expect(allows()).toBe(step === 2 ? 1 : 0);
      }
      expect(prevents()).toBe(1);
    }
  });

  it('a hold and release inside the deferred release give one allow, not two', async () => {
    protectSensitiveScreen()();
    protectSensitiveScreen()();
    await flushRelease();
    expect(prevents()).toBe(1);
    expect(allows()).toBe(1);
  });

  it('a hold landing in a microtask ahead of the deferred release makes no native call', async () => {
    const outgoing = protectSensitiveScreen();
    queueMicrotask(() => {
      protectSensitiveScreen();
    });
    outgoing();
    await flushRelease();
    expect(prevents()).toBe(1);
    expect(allows()).toBe(0);
  });

  it('a hold landing in a microtask behind the deferred release relocks, allow first', async () => {
    const outgoing = protectSensitiveScreen();
    let incoming: () => void = () => undefined;
    outgoing();
    queueMicrotask(() => {
      incoming = protectSensitiveScreen();
    });
    await flushRelease();
    expect(prevents()).toBe(2);
    expect(allows()).toBe(1);
    const [, relock] = mockModule.preventScreenCaptureAsync.mock.invocationCallOrder;
    const [allow] = mockModule.allowScreenCaptureAsync.mock.invocationCallOrder;
    expect(allow!).toBeLessThan(relock!);
    // The count survived: the new holder still gets its own release.
    incoming();
    await flushRelease();
    expect(allows()).toBe(2);
  });

  it('a rejection from native is handled, not left unhandled', async () => {
    const rejected = () => {
      const promise = Promise.reject(new Error('unavailable'));
      return { promise, handled: jest.spyOn(promise, 'catch') };
    };
    const prevent = rejected();
    const allow = rejected();
    mockModule.preventScreenCaptureAsync.mockReturnValueOnce(prevent.promise);
    mockModule.allowScreenCaptureAsync.mockReturnValueOnce(allow.promise);
    protectSensitiveScreen()();
    await flushRelease();
    expect(prevent.handled).toHaveBeenCalledTimes(1);
    expect(allow.handled).toHaveBeenCalledTimes(1);
  });
});

describe('platform specifics', () => {
  it('android: no app switcher call, FLAG_SECURE is enough', async () => {
    setOS('android');
    protectSensitiveScreen()();
    await flushRelease();
    expect(allows()).toBe(1);
    expect(mockModule.enableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
    expect(mockModule.disableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
  });

  it('ios: the blur turns on with the first protection and off with the last', async () => {
    setOS('ios');
    const a = protectSensitiveScreen();
    const b = protectSensitiveScreen();
    expect(mockModule.enableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
    expect(mockModule.enableAppSwitcherProtectionAsync).toHaveBeenCalledWith(1);
    a();
    await flushRelease();
    expect(mockModule.disableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
    b();
    await flushRelease();
    expect(mockModule.disableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
  });

  it('ios: a failing lock call does not stop the blur', () => {
    setOS('ios');
    mockModule.preventScreenCaptureAsync.mockImplementationOnce(() => {
      throw new Error('incompatible');
    });
    protectSensitiveScreen();
    expect(mockModule.enableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
  });

  it('ios: a rejected blur call does not throw', async () => {
    setOS('ios');
    mockModule.enableAppSwitcherProtectionAsync.mockReturnValueOnce(Promise.reject(new Error('unavailable')));
    expect(() => protectSensitiveScreen()()).not.toThrow();
    await flushRelease();
  });

  it('ios: a rejected blur removal is handled and does not stop the next lock', async () => {
    setOS('ios');
    const rejection = Promise.reject(new Error('unavailable'));
    const handled = jest.spyOn(rejection, 'catch');
    mockModule.disableAppSwitcherProtectionAsync.mockReturnValueOnce(rejection);
    protectSensitiveScreen()();
    await flushRelease();
    expect(handled).toHaveBeenCalledTimes(1);
    protectSensitiveScreen();
    expect(prevents()).toBe(2);
    expect(mockModule.enableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(2);
  });
});

describe('useScreenCaptureProtection', () => {
  function Screen({ enabled }: { enabled?: boolean }) {
    useScreenCaptureProtection(enabled);
    return null;
  }

  beforeEach(() => setOS('ios'));

  it('protects while mounted and releases on unmount', async () => {
    const view = render(<Screen />);
    expect(prevents()).toBe(1);
    view.unmount();
    await flushRelease();
    expect(allows()).toBe(1);
  });

  it('does nothing with enabled=false', () => {
    render(<Screen enabled={false} />);
    expect(prevents()).toBe(0);
  });

  it('bank account screen plus identity gate: one prevent, allow only after both unmount', async () => {
    const bankAccount = render(<Screen />);
    const gate = render(<Screen />);
    expect(prevents()).toBe(1);
    gate.unmount();
    await flushRelease();
    expect(allows()).toBe(0);
    expect(prevents()).toBe(1);
    bankAccount.unmount();
    await flushRelease();
    expect(allows()).toBe(1);
  });

  it('a gate remount by key (`missing` changed) stays locked with no native call', async () => {
    const view = render(<Screen key="a" />);
    view.rerender(<Screen key="b" />);
    await flushRelease();
    expect(prevents()).toBe(1);
    expect(allows()).toBe(0);
    // A disable here would remove a blur that is showing while the app is inactive.
    expect(mockModule.enableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
    expect(mockModule.disableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
  });
});

describe.each(['ios', 'android'] as const)('useScreenCaptureProtection lifecycle on %s', (os) => {
  function Screen({ enabled, children }: { enabled?: boolean; children?: React.ReactNode }) {
    useScreenCaptureProtection(enabled);
    return <>{children}</>;
  }

  beforeEach(() => setOS(os));

  it('StrictMode double effects make one prevent and no allow', async () => {
    const view = render(
      <React.StrictMode>
        <Screen />
      </React.StrictMode>,
    );
    await flushRelease();
    expect(prevents()).toBe(1);
    expect(allows()).toBe(0);
    expect(mockModule.disableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
    view.unmount();
    await flushRelease();
    expect(allows()).toBe(1);
  });

  it('StrictMode with overlapping screens still makes one prevent', async () => {
    const first = render(
      <React.StrictMode>
        <Screen />
      </React.StrictMode>,
    );
    const second = render(
      <React.StrictMode>
        <Screen />
      </React.StrictMode>,
    );
    await flushRelease();
    expect(prevents()).toBe(1);
    first.unmount();
    await flushRelease();
    expect(allows()).toBe(0);
    second.unmount();
    await flushRelease();
    expect(allows()).toBe(1);
  });

  it('a gate remount by key keeps the lock: no allow, so FLAG_SECURE never drops', async () => {
    const view = render(<Screen key="a" />);
    view.rerender(<Screen key="b" />);
    await flushRelease();
    expect(prevents()).toBe(1);
    expect(allows()).toBe(0);
  });

  it('a screen unmounted while another mounts before the release runs stays locked', async () => {
    const outgoing = render(<Screen />);
    outgoing.unmount();
    render(<Screen />);
    await flushRelease();
    expect(prevents()).toBe(1);
    expect(allows()).toBe(0);
  });

  it('a screen mounted and unmounted during the deferred release gives one allow', async () => {
    const first = render(<Screen />);
    first.unmount();
    const second = render(<Screen />);
    second.unmount();
    await flushRelease();
    expect(prevents()).toBe(1);
    expect(allows()).toBe(1);
  });

  it('a protected parent and child unmounting in one commit give one allow', async () => {
    const view = render(
      <Screen>
        <Screen />
      </Screen>,
    );
    expect(prevents()).toBe(1);
    view.unmount();
    await flushRelease();
    expect(allows()).toBe(1);
  });

  it('follows `enabled` both ways', async () => {
    const view = render(<Screen enabled={false} />);
    expect(prevents()).toBe(0);
    view.rerender(<Screen enabled />);
    expect(prevents()).toBe(1);
    view.rerender(<Screen enabled={false} />);
    await flushRelease();
    expect(allows()).toBe(1);
    view.rerender(<Screen enabled />);
    expect(prevents()).toBe(2);
    view.unmount();
    await flushRelease();
    expect(allows()).toBe(2);
  });

  it('turning `enabled` off leaves the protection of another screen on', async () => {
    render(<Screen />);
    const other = render(<Screen enabled />);
    other.rerender(<Screen enabled={false} />);
    await flushRelease();
    expect(allows()).toBe(0);
  });
});

describe('through the real library wrapper', () => {
  const nativeModule = {
    preventScreenCapture: jest.fn(() => Promise.resolve()),
    allowScreenCapture: jest.fn(() => Promise.resolve()),
    enableAppSwitcherProtection: jest.fn(() => Promise.resolve()),
    disableAppSwitcherProtection: jest.fn(() => Promise.resolve()),
  };

  afterEach(() => {
    jest.doMock('expo-screen-capture', () => mockModule);
    jest.dontMock('expo-screen-capture/build/ExpoScreenCapture');
    jest.resetModules();
  });

  it('the native module sees one prevent for overlapping screens and one allow at the end', async () => {
    jest.resetModules();
    jest.dontMock('expo-screen-capture');
    jest.doMock('expo-screen-capture/build/ExpoScreenCapture', () => ({
      __esModule: true,
      default: nativeModule,
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { protectSensitiveScreen: protect } = require('../screenCapture');
    const bankAccount = protect();
    const gate = protect();
    expect(nativeModule.preventScreenCapture).toHaveBeenCalledTimes(1);
    gate();
    await flushRelease();
    expect(nativeModule.allowScreenCapture).not.toHaveBeenCalled();
    bankAccount();
    await flushRelease();
    expect(nativeModule.allowScreenCapture).toHaveBeenCalledTimes(1);
    expect(nativeModule.preventScreenCapture).toHaveBeenCalledTimes(1);
  });
});

/**
 * Loads this module and the real library over a native module that behaves like the iOS Swift code:
 * a prevent while locked is the black screen. Every release, hold and microtask order is then walked.
 */
describe.each(['ios', 'android'] as const)('native lock invariants on %s', (os) => {
  type Native = {
    preventScreenCapture?: jest.Mock;
    allowScreenCapture?: jest.Mock;
    enableAppSwitcherProtection?: jest.Mock;
    disableAppSwitcherProtection?: jest.Mock;
  };

  function load(native: Native): typeof import('../screenCapture') {
    jest.resetModules();
    jest.dontMock('expo-screen-capture');
    jest.doMock('expo-screen-capture/build/ExpoScreenCapture', () => ({ __esModule: true, default: native }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Object.defineProperty(require('react-native').Platform, 'OS', { value: os, configurable: true });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../screenCapture');
  }

  afterEach(() => {
    jest.doMock('expo-screen-capture', () => mockModule);
    jest.dontMock('expo-screen-capture/build/ExpoScreenCapture');
    jest.resetModules();
  });

  const OPS = ['hold', 'releaseOldest', 'releaseNewest', 'releaseAgain', 'flush'] as const;

  function sequences(length: number): (typeof OPS)[number][][] {
    if (length === 0) return [[]];
    return sequences(length - 1).flatMap((rest) => OPS.map((op) => [...rest, op]));
  }

  it('no order of holds, releases and microtasks re-enters native or drops the lock', async () => {
    let open: (() => void)[] = [];
    let locked = false;
    let blurred = false;
    let sequence = '';
    const violations = new Set<string>();
    const violation = (what: string) => violations.add(`${what} after ${sequence}`);
    const { protectSensitiveScreen: protect } = load({
      preventScreenCapture: jest.fn(() => {
        if (locked) violation('prevent while locked');
        locked = true;
        return Promise.resolve();
      }),
      allowScreenCapture: jest.fn(() => {
        if (open.length > 0) violation('allow while a screen is protected');
        locked = false;
        return Promise.resolve();
      }),
      enableAppSwitcherProtection: jest.fn(() => {
        if (os === 'android') violation('blur call on android');
        blurred = true;
        return Promise.resolve();
      }),
      disableAppSwitcherProtection: jest.fn(() => {
        if (open.length > 0) violation('blur removed while a screen is protected');
        blurred = false;
        return Promise.resolve();
      }),
    });

    for (const ops of sequences(6)) {
      sequence = ops.join(' ');
      const released: (() => void)[] = [];
      const release = (hold: (() => void) | undefined) => {
        if (!hold) return;
        open = open.filter((candidate) => candidate !== hold);
        hold();
        released.push(hold);
      };
      for (const op of ops) {
        if (op === 'hold') open.push(protect());
        if (op === 'releaseOldest') release(open[0]);
        if (op === 'releaseNewest') release(open[open.length - 1]);
        if (op === 'releaseAgain') released[0]?.();
        if (op === 'flush') {
          await flushRelease();
          if (open.length === 0 && locked) violation('still locked with no screen open');
        }
        if (open.length > 0 && !locked) violation('a protected screen is not locked');
        if (open.length > 0 && blurred !== (os === 'ios')) violation('the blur does not follow the lock');
      }
      // Next sequence starts from no holders, through the same module and library state.
      while (open.length > 0) release(open[0]);
      await flushRelease();
      if (locked || blurred) violation('not released at the end');
    }
    expect([...violations].slice(0, 10)).toEqual([]);
  });

  it('a failed first prevent is not retried while held, and is on the next hold', async () => {
    const native = {
      preventScreenCapture: jest.fn(() => Promise.resolve()),
      allowScreenCapture: jest.fn(() => Promise.resolve()),
      enableAppSwitcherProtection: jest.fn(() => Promise.resolve()),
      disableAppSwitcherProtection: jest.fn(() => Promise.resolve()),
    };
    native.preventScreenCapture.mockImplementationOnce(() => Promise.reject(new Error('no activity')));
    const { protectSensitiveScreen: protect } = load(native);
    const first = protect();
    await flushRelease();
    const second = protect();
    await flushRelease();
    // Accepted: no retry while held. A second prevent with the same key stops at the library tag anyway,
    // and one that reached native after a partial lock would be the black screen.
    expect(native.preventScreenCapture).toHaveBeenCalledTimes(1);
    first();
    second();
    await flushRelease();
    // The library tag must not stay behind, or the next prevent would never reach native.
    expect(native.allowScreenCapture).toHaveBeenCalledTimes(1);
    protect();
    expect(native.preventScreenCapture).toHaveBeenCalledTimes(2);
  });

  it('a binary without the blur functions still locks and releases', async () => {
    const native = {
      preventScreenCapture: jest.fn(() => Promise.resolve()),
      allowScreenCapture: jest.fn(() => Promise.resolve()),
    };
    const { protectSensitiveScreen: protect } = load(native);
    const release = protect();
    expect(native.preventScreenCapture).toHaveBeenCalledTimes(1);
    expect(release).not.toThrow();
    await flushRelease();
    expect(native.allowScreenCapture).toHaveBeenCalledTimes(1);
  });
});

describe('native module missing', () => {
  afterEach(() => {
    jest.doMock('expo-screen-capture', () => mockModule);
    jest.resetModules();
  });

  it('protection is a no-op when the module fails to load, and the screen works', async () => {
    const failingLoad = jest.fn(() => {
      throw new Error("Cannot find native module 'ExpoScreenCapture'");
    });
    // resetModules, not isolateModules: the mock registry already holds the working module.
    jest.resetModules();
    jest.doMock('expo-screen-capture', failingLoad);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { protectSensitiveScreen: protect } = require('../screenCapture');
    const first = protect();
    const second = protect();
    expect(() => {
      first();
      first();
      second();
    }).not.toThrow();
    await flushRelease();
    expect(failingLoad).toHaveBeenCalled();
    expect(prevents()).toBe(0);
    expect(allows()).toBe(0);
  });
});

describe('the one native lock has no way around it', () => {
  const ROOT = path.resolve(__dirname, '../../../..');
  const THIS_MODULE = path.join('src', 'lib', 'security', 'screenCapture.ts');

  function sources(dir: string): string[] {
    return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(rel);
      return /\.tsx?$/.test(entry.name) ? [rel] : [];
    });
  }

  it('only this module imports expo-screen-capture: a second caller is the black screen again', () => {
    const importers = [...sources('src'), ...sources('app')].filter((rel) =>
      /['"]expo-screen-capture(\/[^'"]*)?['"]/.test(fs.readFileSync(path.join(ROOT, rel), 'utf8')),
    );
    expect(importers).toEqual([THIS_MODULE]);
  });

  it.each([
    'src/components/CardPaymentForm.tsx',
    'src/components/required-steps/LegalIdentityGate.tsx',
    'app/settings/bank-account/index.tsx',
    'app/settings/business-application/index.tsx',
    'app/settings/security/two-factor.tsx',
  ])('%s stays protected, unconditionally', (rel) => {
    expect(fs.readFileSync(path.join(ROOT, rel), 'utf8')).toMatch(/^\s*useScreenCaptureProtection\(\);$/m);
  });
});
