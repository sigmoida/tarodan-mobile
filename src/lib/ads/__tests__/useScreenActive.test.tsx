import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';

const mockBlur: Array<() => void> = [];
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb() as () => void;
        mockBlur.push(cleanup);
        return cleanup;
      }, [cb]);
    },
  };
});

import { useScreenActive } from '../useScreenActive';

describe('useScreenActive', () => {
  let listener: ((s: string) => void) | null = null;
  beforeEach(() => {
    mockBlur.length = 0;
    listener = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
      listener = cb;
      return { remove: jest.fn() };
    }) as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it('odakta + uygulama önde: true', () => {
    const { result } = renderHook(() => useScreenActive());
    expect(result.current).toBe(true);
  });

  it('ekran odağı kaybedince false', () => {
    const { result } = renderHook(() => useScreenActive());
    act(() => mockBlur[0]!());
    expect(result.current).toBe(false);
  });

  it('uygulama arka plana geçince false, dönünce true', () => {
    const { result } = renderHook(() => useScreenActive());
    act(() => listener!('background'));
    expect(result.current).toBe(false);
    act(() => listener!('active'));
    expect(result.current).toBe(true);
  });
});
