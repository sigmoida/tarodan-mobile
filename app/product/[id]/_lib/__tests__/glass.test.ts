/**
 * Liquid Glass koruması: modül yok / iOS < 26 / Android'de `null` (fallback), yalnız iOS 26'da cam.
 * `expo-glass-effect` yerel modüldür; eski binary'de require atar — ekran asla çökmemeli.
 */
import { Platform } from 'react-native';

const GlassView = () => null;

function load(os: 'ios' | 'android', factory: () => unknown) {
  let result: unknown = undefined;
  jest.isolateModules(() => {
    Platform.OS = os;
    jest.doMock('expo-glass-effect', factory as any);
    const mod = require('../glass') as typeof import('../glass');
    result = mod.getGlassView();
  });
  return result;
}

describe('getGlassView', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
    jest.resetModules();
  });

  it('iOS 26 (API var): GlassView döner', () => {
    const got = load('ios', () => ({
      GlassView,
      isLiquidGlassAvailable: () => true,
      isGlassEffectAPIAvailable: () => true,
    }));
    expect(got).toBe(GlassView);
  });

  it('iOS < 26 (isLiquidGlassAvailable=false): null', () => {
    const got = load('ios', () => ({
      GlassView,
      isLiquidGlassAvailable: () => false,
      isGlassEffectAPIAvailable: () => true,
    }));
    expect(got).toBeNull();
  });

  it('iOS 26 beta (cam API eksik): null', () => {
    const got = load('ios', () => ({
      GlassView,
      isLiquidGlassAvailable: () => true,
      isGlassEffectAPIAvailable: () => false,
    }));
    expect(got).toBeNull();
  });

  it('yerel modül yok (eski binary / Expo Go): require atar, çökmez, null', () => {
    const got = load('ios', () => {
      throw new Error("Cannot find native module 'ExpoGlassEffect'");
    });
    expect(got).toBeNull();
  });

  it('Android: modüle hiç bakmadan null', () => {
    const factory = jest.fn(() => ({
      GlassView,
      isLiquidGlassAvailable: () => true,
      isGlassEffectAPIAvailable: () => true,
    }));
    const got = load('android', factory);
    expect(got).toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });
});
