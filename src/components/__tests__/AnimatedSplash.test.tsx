/**
 * AnimatedSplash — JS splash, native splash'in son karesiyle birebir başlar:
 * düz zemin (#FE6F13), aynı ikon, aynı boyut, ekran merkezi. Sonra kısa fade-out.
 * Reanimated burada kontrollü bir taklitle değiştirilir (zamanlama deterministik).
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

const mockReduceMotion = { value: false };
const mockTimingCalls: Array<{ to: number; duration: number }> = [];
let mockFinishAnimation: (() => void) | null = null;

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: {
      View: ({ style, ...rest }: { style?: unknown }) => React.createElement(View, { style, ...rest }),
    },
    Easing: { out: () => () => 0, quad: () => 0 },
    useReducedMotion: () => mockReduceMotion.value,
    useSharedValue: (v: number) => React.useRef({ value: v }).current,
    useAnimatedStyle: () => ({}),
    runOnJS: (fn: () => void) => fn,
    withTiming: (
      to: number,
      cfg: { duration: number },
      cb?: (done: boolean) => void,
    ) => {
      mockTimingCalls.push({ to, duration: cfg.duration });
      mockFinishAnimation = () => cb?.(true);
      return to;
    },
  };
});

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

import AnimatedSplash, {
  EXIT_FADE_MS,
  MIN_VISIBLE_MS,
  SPLASH_BACKGROUND,
  SPLASH_ICON_SIZE,
  SPLASH_ICON_SIZE_ANDROID,
  SPLASH_ICON_SIZE_IOS,
} from '../AnimatedSplash';

const appJson = require('../../../app.json');

function nativeSplashConfig() {
  const plugin = appJson.expo.plugins.find(
    (p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen',
  );
  return plugin[1] as { backgroundColor: string; image: string; imageWidth: number };
}

describe('AnimatedSplash', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockTimingCalls.length = 0;
    mockFinishAnimation = null;
    mockReduceMotion.value = false;
    (SplashScreen.hideAsync as jest.Mock).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('native splash ile aynı statik değerler: zemin rengi, ikon görseli, iOS boyutu', () => {
    const native = nativeSplashConfig();
    expect(SPLASH_BACKGROUND.toLowerCase()).toBe(native.backgroundColor.toLowerCase());
    expect(native.image).toBe('./assets/splash-icon-square.png');
    expect(SPLASH_ICON_SIZE_IOS).toBe(native.imageWidth);
    expect(SPLASH_ICON_SIZE_ANDROID).toBe(288);
    // jest-expo varsayılan platformu iOS.
    expect(SPLASH_ICON_SIZE).toBe(SPLASH_ICON_SIZE_IOS);
  });

  it('ilk kare: düz zemin rengi + ikon platform boyutunda ve ekran merkezinde', () => {
    const { getByTestId } = render(<AnimatedSplash appReady={false} onFinish={jest.fn()} />);
    const root = StyleSheet.flatten(getByTestId('animated-splash').props.style);
    expect(root.backgroundColor).toBe(SPLASH_BACKGROUND);
    expect(root.alignItems).toBe('center');
    expect(root.justifyContent).toBe('center');
    const icon = StyleSheet.flatten(getByTestId('animated-splash-icon').props.style);
    expect(icon.width).toBe(SPLASH_ICON_SIZE);
    expect(icon.height).toBe(SPLASH_ICON_SIZE);
  });

  it('gradyan/slogan/nokta yok: yalnız düz zemin + ikon', () => {
    const { queryByText, toJSON } = render(
      <AnimatedSplash appReady={false} onFinish={jest.fn()} />,
    );
    expect(queryByText(/./)).toBeNull();
    expect(JSON.stringify(toJSON())).not.toContain('LinearGradient');
  });

  it('SplashScreen.hideAsync onLayout\'ta bir kez çağrılır', () => {
    const { getByTestId } = render(<AnimatedSplash appReady={false} onFinish={jest.fn()} />);
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    const root = getByTestId('animated-splash');
    root.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 1, height: 1 } } });
    root.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 1, height: 1 } } });
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it('minimum süre (500ms) dolmadan hazır olsa da çıkış başlamaz', () => {
    expect(MIN_VISIBLE_MS).toBe(500);
    const onFinish = jest.fn();
    render(<AnimatedSplash appReady onFinish={onFinish} />);
    act(() => {
      jest.advanceTimersByTime(MIN_VISIBLE_MS - 1);
    });
    expect(mockTimingCalls).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockTimingCalls).toEqual([{ to: 0, duration: EXIT_FADE_MS }]);
  });

  it('appReady geç gelirse bekler (ikon sabit, animasyon yok), gelince çıkar', () => {
    const onFinish = jest.fn();
    const { rerender } = render(<AnimatedSplash appReady={false} onFinish={onFinish} />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(mockTimingCalls).toHaveLength(0);
    expect(onFinish).not.toHaveBeenCalled();
    rerender(<AnimatedSplash appReady onFinish={onFinish} />);
    expect(mockTimingCalls).toEqual([{ to: 0, duration: EXIT_FADE_MS }]);
  });

  it('onFinish fade-out bitince YALNIZ bir kez çağrılır', () => {
    const onFinish = jest.fn();
    const { rerender } = render(<AnimatedSplash appReady onFinish={onFinish} />);
    act(() => {
      jest.advanceTimersByTime(MIN_VISIBLE_MS);
    });
    expect(onFinish).not.toHaveBeenCalled();
    act(() => mockFinishAnimation?.());
    act(() => mockFinishAnimation?.());
    rerender(<AnimatedSplash appReady onFinish={onFinish} />);
    act(() => {
      jest.advanceTimersByTime(10000); // güvenlik zamanlayıcısı da tekrar çağırmaz
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('Hareketi azalt: animasyonsuz, süre dolunca doğrudan biter', () => {
    mockReduceMotion.value = true;
    const onFinish = jest.fn();
    render(<AnimatedSplash appReady onFinish={onFinish} />);
    act(() => {
      jest.advanceTimersByTime(MIN_VISIBLE_MS);
    });
    expect(mockTimingCalls).toHaveLength(0);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('güvenlik ağı: appReady hiç gelmezse 8 sn sonra kapanır', () => {
    const onFinish = jest.fn();
    render(<AnimatedSplash appReady={false} onFinish={onFinish} />);
    act(() => {
      jest.advanceTimersByTime(7999);
    });
    expect(onFinish).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
