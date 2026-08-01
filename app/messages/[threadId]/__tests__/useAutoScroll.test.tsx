import { renderHook, act } from '@testing-library/react-native';
import { useAutoScroll } from '../_hooks/useAutoScroll';
import { NEAR_BOTTOM_THRESHOLD } from '../_lib/scroll';

const scrollToEnd = jest.fn();
const scrollRef = { current: { scrollToEnd } as any };

const scrollEvent = (distanceFromBottom: number) => ({
  nativeEvent: {
    contentSize: { height: 1000, width: 0 },
    layoutMeasurement: { height: 500, width: 0 },
    contentOffset: { x: 0, y: 1000 - 500 - distanceFromBottom },
  },
}) as any;

describe('useAutoScroll', () => {
  beforeEach(() => {
    scrollToEnd.mockClear();
  });

  it('ilk yükleme: içerik hazırsa animasyonsuz dibe konumlanır ve isPositioned true olur', () => {
    const setIsPositioned = jest.fn();
    const { result } = renderHook(() => useAutoScroll(scrollRef, false, setIsPositioned, true));

    act(() => { result.current.handleContentSizeChange(); });

    expect(scrollToEnd).toHaveBeenCalledWith({ animated: false });
    expect(setIsPositioned).toHaveBeenCalledWith(true);
  });

  it('ilk yükleme: içerik henüz hazır değilse kaydırmaz', () => {
    const setIsPositioned = jest.fn();
    const { result } = renderHook(() => useAutoScroll(scrollRef, false, setIsPositioned, false));

    act(() => { result.current.handleContentSizeChange(); });

    expect(scrollToEnd).not.toHaveBeenCalled();
    expect(setIsPositioned).not.toHaveBeenCalled();
  });

  it('kullanıcı dibe yakınken içerik büyürse dibe kaydırır', () => {
    const setIsPositioned = jest.fn();
    const { result } = renderHook(() => useAutoScroll(scrollRef, true, setIsPositioned, true));

    act(() => { result.current.handleScroll(scrollEvent(NEAR_BOTTOM_THRESHOLD - 1)); });
    act(() => { result.current.handleContentSizeChange(); });

    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });

  it('kullanıcı yukarıda okurken içerik büyürse KAYDIRMAZ', () => {
    const setIsPositioned = jest.fn();
    const { result } = renderHook(() => useAutoScroll(scrollRef, true, setIsPositioned, true));

    act(() => { result.current.handleScroll(scrollEvent(NEAR_BOTTOM_THRESHOLD + 500)); });
    act(() => { result.current.handleContentSizeChange(); });

    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('forceScrollToBottom çağrılırsa, kullanıcı yukarıda olsa bile bir sonraki içerik değişiminde dibe kaydırır', () => {
    const setIsPositioned = jest.fn();
    const { result } = renderHook(() => useAutoScroll(scrollRef, true, setIsPositioned, true));

    act(() => { result.current.handleScroll(scrollEvent(NEAR_BOTTOM_THRESHOLD + 500)); });
    act(() => { result.current.forceScrollToBottom(); });
    act(() => { result.current.handleContentSizeChange(); });

    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });

  it('forceScrollToBottom bayrağı bir kez tüketilir — sonraki büyümede tekrar zorlamaz', () => {
    const setIsPositioned = jest.fn();
    const { result } = renderHook(() => useAutoScroll(scrollRef, true, setIsPositioned, true));

    act(() => { result.current.handleScroll(scrollEvent(NEAR_BOTTOM_THRESHOLD + 500)); });
    act(() => { result.current.forceScrollToBottom(); });
    act(() => { result.current.handleContentSizeChange(); });
    scrollToEnd.mockClear();

    act(() => { result.current.handleContentSizeChange(); });
    expect(scrollToEnd).not.toHaveBeenCalled();
  });
});
