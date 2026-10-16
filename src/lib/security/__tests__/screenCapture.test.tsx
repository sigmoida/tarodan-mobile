/**
 * Hassas ekran koruması (`screenCapture.ts`): anahtar başına engelle/izin ver, iOS uygulama
 * değiştirici bulanıklığı sayaçla, native modül yoksa sessizce devre dışı.
 */
import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';

const mockModule = {
  preventScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn(() => Promise.resolve()),
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

beforeEach(() => {
  __resetScreenCaptureProtection();
  jest.clearAllMocks();
});
afterAll(() => setOS(originalOS));

describe('protectSensitiveScreen', () => {
  it('Android: anahtarla engeller, bırakınca izin verir; uygulama değiştirici çağrısı yok (FLAG_SECURE yeterli)', () => {
    setOS('android');
    const release = protectSensitiveScreen('a');
    expect(mockModule.preventScreenCaptureAsync).toHaveBeenCalledWith('a');
    expect(mockModule.enableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
    release();
    release(); // ikinci çağrı zararsız
    expect(mockModule.allowScreenCaptureAsync).toHaveBeenCalledTimes(1);
    expect(mockModule.allowScreenCaptureAsync).toHaveBeenCalledWith('a');
  });

  it('iOS: bulanıklık ilk korumada açılır, SON koruma kapanınca kalkar', () => {
    setOS('ios');
    const a = protectSensitiveScreen('a');
    const b = protectSensitiveScreen('b');
    expect(mockModule.enableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
    a();
    expect(mockModule.disableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
    b();
    expect(mockModule.disableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
  });

  it('native çağrı reddedilse de fırlatmaz', async () => {
    setOS('ios');
    mockModule.preventScreenCaptureAsync.mockReturnValueOnce(Promise.reject(new Error('unavailable')));
    mockModule.enableAppSwitcherProtectionAsync.mockReturnValueOnce(Promise.reject(new Error('unavailable')));
    expect(() => protectSensitiveScreen('x')()).not.toThrow();
    await Promise.resolve();
  });
});

describe('useScreenCaptureProtection', () => {
  function Screen({ enabled }: { enabled?: boolean }) {
    useScreenCaptureProtection(enabled);
    return null;
  }

  it('bağlıyken korur, sökülünce bırakır', () => {
    setOS('android');
    const view = render(<Screen />);
    expect(mockModule.preventScreenCaptureAsync).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(mockModule.allowScreenCaptureAsync).toHaveBeenCalledTimes(1);
  });

  it('enabled=false iken hiçbir şey yapmaz', () => {
    render(<Screen enabled={false} />);
    expect(mockModule.preventScreenCaptureAsync).not.toHaveBeenCalled();
  });
});

describe('native modül yok', () => {
  it('yükleme hatasında koruma no-op olur, ekran çalışır', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-screen-capture', () => {
        throw new Error("Cannot find native module 'ExpoScreenCapture'");
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { protectSensitiveScreen: protect } = require('../screenCapture');
      expect(() => protect('k')()).not.toThrow();
    });
  });
});
