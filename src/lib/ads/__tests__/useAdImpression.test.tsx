/**
 * Gösterim sayacı — mount'ta değil; reklam hazır + ekran odakta + uygulama
 * önde olup 1 sn sürünce, reklam başına BİR kez.
 */
import { AppState } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb();
        return cleanup;
      }, [cb]);
    },
  };
});

const mockRecordImpression = jest.fn(() => Promise.resolve());
jest.mock('@/lib/api', () => ({
  adsApi: { recordImpression: (...a: unknown[]) => mockRecordImpression(...(a as [])) },
}));

import { useAdImpression, IMPRESSION_DWELL_MS } from '../useAdImpression';

describe('useAdImpression', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRecordImpression.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('mount anında göndermez; bekleme süresinden sonra bir kez gönderir', () => {
    const { rerender } = renderHook(({ ready }: { ready: boolean }) => useAdImpression('ad-1', ready), {
      initialProps: { ready: true },
    });
    expect(mockRecordImpression).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
    });
    expect(mockRecordImpression).toHaveBeenCalledTimes(1);
    expect(mockRecordImpression).toHaveBeenCalledWith('ad-1');

    rerender({ ready: true });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockRecordImpression).toHaveBeenCalledTimes(1);
  });

  it('görsel yüklenmeden (ready=false) göndermez, yüklenince sayar', () => {
    const { rerender } = renderHook(({ ready }: { ready: boolean }) => useAdImpression('ad-1', ready), {
      initialProps: { ready: false },
    });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockRecordImpression).not.toHaveBeenCalled();

    rerender({ ready: true });
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
    });
    expect(mockRecordImpression).toHaveBeenCalledTimes(1);
  });

  it('uygulama arka plandaysa sayılmaz', () => {
    let listener: ((s: string) => void) | null = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
      listener = cb;
      return { remove: jest.fn() };
    }) as any);

    renderHook(() => useAdImpression('ad-2', true));
    act(() => {
      listener?.('background');
    });
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS * 3);
    });
    expect(mockRecordImpression).not.toHaveBeenCalled();

    act(() => {
      listener?.('active');
    });
    act(() => {
      jest.advanceTimersByTime(IMPRESSION_DWELL_MS);
    });
    expect(mockRecordImpression).toHaveBeenCalledTimes(1);
  });
});
