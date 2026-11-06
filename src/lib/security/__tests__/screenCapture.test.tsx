/**
 * Sensitive screen protection (`screenCapture.ts`): one native lock however many screens are
 * protected, iOS app switcher blur by counter, silently disabled without the native module.
 */
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
    await expect(flushRelease()).resolves.toBeUndefined();
    expect(allows()).toBe(1);
  });
});

describe('platform specifics', () => {
  it('android: no app switcher call, FLAG_SECURE is enough', () => {
    setOS('android');
    protectSensitiveScreen()();
    expect(mockModule.enableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
    expect(mockModule.disableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
  });

  it('ios: the blur turns on with the first protection and off with the last', () => {
    setOS('ios');
    const a = protectSensitiveScreen();
    const b = protectSensitiveScreen();
    expect(mockModule.enableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
    a();
    expect(mockModule.disableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
    b();
    expect(mockModule.disableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
  });

  it('ios: a rejected blur call does not throw', async () => {
    setOS('ios');
    mockModule.enableAppSwitcherProtectionAsync.mockReturnValueOnce(Promise.reject(new Error('unavailable')));
    expect(() => protectSensitiveScreen()()).not.toThrow();
    await flushRelease();
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
