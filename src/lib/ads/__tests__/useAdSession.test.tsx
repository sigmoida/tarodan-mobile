/**
 * Reklam oturumu: ilk odak oturumu başlatmaz; ekran yeniden odaklanınca yeni
 * tohum + boş gösterim kümesi ("sayfa yüklemesi" karşılığı).
 */
import { act, renderHook } from '@testing-library/react-native';

let mockFocusCb: (() => void | (() => void)) | null = null;
let mockCleanup: void | (() => void);
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        mockFocusCb = cb;
        mockCleanup = cb();
        return () => {};
      }, [cb]);
    },
  };
});

import { useAdSession } from '../useAdSession';

const blur = () => act(() => void (typeof mockCleanup === 'function' && mockCleanup()));
const focus = () => act(() => void (mockCleanup = mockFocusCb!()));

describe('useAdSession', () => {
  it('ilk odakta oturum yenilenmez; blur → focus ile tohum ve gösterim kümesi yenilenir', () => {
    const { result } = renderHook(() => useAdSession());
    const first = result.current;
    first.sentImpressions.add('x');
    expect(result.current).toBe(first);

    blur();
    expect(result.current).toBe(first); // ayrılmak oturumu bozmaz
    focus();
    expect(result.current).not.toBe(first);
    expect(result.current.sentImpressions.size).toBe(0);
    expect(result.current.sentImpressions).not.toBe(first.sentImpressions);
  });

  it('her yeniden odakta yeni oturum', () => {
    const { result } = renderHook(() => useAdSession());
    const seen = new Set([result.current]);
    for (let i = 0; i < 3; i += 1) {
      blur();
      focus();
      seen.add(result.current);
    }
    expect(seen.size).toBe(4);
  });
});
