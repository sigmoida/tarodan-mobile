/**
 * Regression for the invisible toast on iOS 26 (tarodan-mobile#45).
 *
 * The presenter is mounted while no toast is shown, so `glass` is false on the first run of the
 * animated style and Reanimated freezes `opacity: 0` as the view's initial style. Reanimated sends only
 * the keys a worklet returns, so a glass branch without `opacity` never clears that 0.
 *
 * What this can see: the JS style Reanimated's jest updater tracks, which is seeded from the same
 * initial style. What it can't see: the native alpha of the view or whether Liquid Glass renders. That
 * needs a check on an iOS 26 device (issue #45 > Tests).
 *
 * The assertions start after one frame: the view is still created with the frozen initial style, and
 * the first run of the style's mapper replaces it.
 */
import React from 'react';
import {
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
  type PanResponderCallbacks,
  type PanResponderGestureState,
} from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { resetToastForTests, toast, ToastHost, ToastLayer } from '../Toast';
import { getGlassView } from '../../lib/glass';
import { theme } from '../../lib/theme';

let mockReduceMotion = false;
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    useReducedMotion: () => mockReduceMotion,
  };
});
jest.mock('../../lib/glass', () => ({ getGlassView: jest.fn(() => null) }));
const getGlassViewMock = getGlassView as jest.Mock;

function Glass(props: React.ComponentProps<typeof View>) {
  return <View {...props} testID="glass-view" />;
}

/** One Reanimated frame, enough for the style's first mapper run. */
const FRAME = 16;
/** Longer than both the enter and the exit animation, with room for Reanimated's frames. */
const SETTLE = 600;
/** Well inside the enter and exit animations. */
const MID_ANIMATION = 50;

const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

type WrapStyle = { opacity?: number; transform?: Record<string, number>[] };
const wrapStyle = () => getAnimatedStyle(screen.getByTestId('toast')) as WrapStyle;
const translateY = () => wrapStyle().transform?.find((t) => 'translateY' in t)?.translateY;
const show = () =>
  act(() => {
    toast.success('Saved', { duration: 0 });
  });

beforeEach(() => {
  jest.useFakeTimers();
  resetToastForTests();
  mockReduceMotion = false;
  getGlassViewMock.mockReset();
  getGlassViewMock.mockReturnValue(null);
});
afterEach(() => {
  jest.useRealTimers();
});

describe('toast wrap style on Liquid Glass: an ancestor of the glass must stay at opacity 1', () => {
  beforeEach(() => {
    getGlassViewMock.mockReturnValue(Glass);
  });

  it.each([
    ['default motion', false],
    ['reduced motion', true],
  ])('%s: opacity is 1 through enter, rest and exit, after mounting empty', (_label, reduced) => {
    mockReduceMotion = reduced;
    render(<ToastHost />);

    show();
    expect(screen.getByTestId('glass-view')).toBeTruthy();
    advance(FRAME);
    expect(wrapStyle().opacity).toBe(1);

    advance(MID_ANIMATION);
    expect(wrapStyle().opacity).toBe(1);

    advance(SETTLE);
    expect(wrapStyle().opacity).toBe(1);

    act(() => toast.dismiss());
    advance(MID_ANIMATION);
    expect(wrapStyle().opacity).toBe(1);
  });

  it.each([
    ['default motion', false],
    ['reduced motion', true],
  ])('%s: a toast after the first one is removed also has opacity 1', (_label, reduced) => {
    mockReduceMotion = reduced;
    render(<ToastHost />);
    show();
    advance(SETTLE);
    act(() => toast.dismiss());
    advance(SETTLE);
    expect(screen.queryByTestId('toast')).toBeNull();

    show();
    advance(FRAME);
    expect(wrapStyle().opacity).toBe(1);
    advance(SETTLE);
    expect(wrapStyle().opacity).toBe(1);
  });

  it('a layer taking over a shown toast keeps opacity 1', () => {
    const Tree = ({ modal }: { modal: boolean }) => (
      <>
        <ToastHost />
        {modal ? <ToastLayer /> : null}
      </>
    );
    const view = render(<Tree modal={false} />);
    show();
    advance(SETTLE);

    view.rerender(<Tree modal />);
    advance(SETTLE);
    expect(screen.getAllByTestId('toast')).toHaveLength(1);
    expect(wrapStyle().opacity).toBe(1);
  });

  it('default motion: the surface hides by sliding, not by fading', () => {
    render(<ToastHost />);
    show();
    advance(FRAME);
    expect(translateY()).toBeGreaterThan(0);
    advance(SETTLE);
    expect(translateY()).toBe(0);
  });

  it('reduced motion: the surface does not slide', () => {
    mockReduceMotion = true;
    render(<ToastHost />);
    show();
    advance(FRAME);
    expect(translateY()).toBe(0);
    advance(SETTLE);
    expect(translateY()).toBe(0);
  });
});

describe('swipe to dismiss', () => {
  let panResponderCreate: jest.SpyInstance;
  beforeEach(() => {
    panResponderCreate = jest.spyOn(PanResponder, 'create');
  });
  afterEach(() => {
    panResponderCreate.mockRestore();
  });

  /** Releases the latest responder as if the toast was dragged by `dy`. */
  const release = (dy: number) => {
    const config = panResponderCreate.mock.lastCall![0] as PanResponderCallbacks;
    act(() => {
      config.onPanResponderRelease!({} as never, { dy, vy: 0 } as PanResponderGestureState);
    });
  };
  /** The swipe's own animation has ended and the exit that follows it has started. */
  const SWIPE = 200;
  const EXIT_STEP = 30;
  const EXIT_STEPS = 3;

  it('without glass: up, it moves by its travel only and fades', () => {
    render(<ToastHost />);
    show();
    advance(SETTLE);
    const { bottom } = StyleSheet.flatten(screen.getByTestId('toast').props.style);

    release(-100);
    advance(SWIPE);
    expect(translateY()).toBe(-(bottom + 2 * theme.controlHeight.lg));
    advance(MID_ANIMATION);
    expect(wrapStyle().opacity).toBeLessThan(1);
  });

  describe('on Liquid Glass: the surface can not fade, so it must leave the screen', () => {
    beforeEach(() => {
      getGlassViewMock.mockReturnValue(Glass);
    });

    it('the same id coming back during the exit returns to rest and still expires', () => {
      render(<ToastHost />);
      act(() => {
        toast('Uploading', { id: 'upload', duration: 2000 });
      });
      advance(SETTLE);

      release(-100);
      advance(SWIPE);
      act(() => {
        toast('Uploading', { id: 'upload', duration: 2000 });
      });
      advance(SETTLE);
      expect(translateY()).toBe(0);
      expect(wrapStyle().opacity).toBe(1);

      advance(2000);
      advance(SETTLE);
      expect(screen.queryByTestId('toast')).toBeNull();
    });

    it.each([
      ['default motion', false],
      ['reduced motion', true],
    ])('%s: up, it stays above the screen until it is removed', (_label, reduced) => {
      mockReduceMotion = reduced;
      const { height } = Dimensions.get('window');
      render(<ToastHost />);
      show();
      advance(SETTLE);

      release(-100);
      advance(SWIPE);
      for (let i = 0; i < EXIT_STEPS; i += 1) {
        expect(screen.queryByTestId('toast')).not.toBeNull();
        expect(translateY()).toBeLessThanOrEqual(-height);
        advance(EXIT_STEP);
      }
      advance(SETTLE);
      expect(screen.queryByTestId('toast')).toBeNull();
    });

    it.each([
      ['default motion', false],
      ['reduced motion', true],
    ])('%s: down, it stays below its rest position until it is removed', (_label, reduced) => {
      mockReduceMotion = reduced;
      render(<ToastHost />);
      show();
      advance(SETTLE);

      release(100);
      advance(SWIPE);
      for (let i = 0; i < EXIT_STEPS; i += 1) {
        expect(screen.queryByTestId('toast')).not.toBeNull();
        // More than the bottom offset plus the card, so the card is under the screen edge.
        expect(translateY()).toBeGreaterThan(70);
        advance(EXIT_STEP);
      }
      advance(SETTLE);
      expect(screen.queryByTestId('toast')).toBeNull();
    });
  });
});

describe('toast wrap style without glass: still fades', () => {
  it.each([
    ['default motion', false],
    ['reduced motion', true],
  ])('%s: opacity follows the enter and exit animations', (_label, reduced) => {
    mockReduceMotion = reduced;
    render(<ToastHost />);

    show();
    expect(screen.queryByTestId('glass-view')).toBeNull();
    advance(MID_ANIMATION);
    expect(wrapStyle().opacity).toBeGreaterThan(0);
    expect(wrapStyle().opacity).toBeLessThan(1);

    advance(SETTLE);
    expect(wrapStyle().opacity).toBe(1);

    act(() => toast.dismiss());
    advance(MID_ANIMATION);
    expect(wrapStyle().opacity).toBeLessThan(1);
    expect(wrapStyle().opacity).toBeGreaterThan(0);
  });
});

describe('native module access', () => {
  it('an empty layer does not query the glass module', () => {
    render(<ToastHost />);
    expect(getGlassViewMock).not.toHaveBeenCalled();
  });
});
