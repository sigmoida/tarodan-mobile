import { renderHook, act } from '@testing-library/react-native';
import { useTypingIndicator } from '../_hooks/useTypingIndicator';

const emit = jest.fn();
const handlers: Record<string, (p: any) => void> = {};
const mockSocket = {
  emit,
  on: jest.fn((e: string, h: (p: any) => void) => { handlers[e] = h; }),
  off: jest.fn(),
};

jest.mock('@/services/socket', () => ({ getSocket: () => mockSocket }));

describe('useTypingIndicator', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('ilk tuş vuruşunda typing:start yayınlar, tekrarında yayınlamaz', () => {
    const { result } = renderHook(() => useTypingIndicator('t1'));
    act(() => { result.current.notifyTyping(); });
    act(() => { result.current.notifyTyping(); });
    const starts = emit.mock.calls.filter(([e]) => e === 'typing:start');
    expect(starts).toHaveLength(1);
    expect(starts[0][1]).toEqual({ threadId: 't1' });
  });

  it('3 sn sessizlikten sonra typing:stop yayınlar', () => {
    const { result } = renderHook(() => useTypingIndicator('t1'));
    act(() => { result.current.notifyTyping(); });
    expect(emit).not.toHaveBeenCalledWith('typing:stop', expect.anything());
    act(() => { jest.advanceTimersByTime(3000); });
    expect(emit).toHaveBeenCalledWith('typing:stop', { threadId: 't1' });
  });

  it('karşı taraf yazınca gösterge açılır, stop gelince kapanır', () => {
    const { result } = renderHook(() => useTypingIndicator('t1'));
    expect(result.current.isPeerTyping).toBe(false);
    act(() => { handlers['typing:started']({ threadId: 't1' }); });
    expect(result.current.isPeerTyping).toBe(true);
    act(() => { handlers['typing:stopped']({ threadId: 't1' }); });
    expect(result.current.isPeerTyping).toBe(false);
  });

  it('başka thread’in typing olayı göstergeyi açmaz', () => {
    const { result } = renderHook(() => useTypingIndicator('t1'));
    act(() => { handlers['typing:started']({ threadId: 'BASKA' }); });
    expect(result.current.isPeerTyping).toBe(false);
  });

  it('stop hiç gelmezse gösterge 5 sn sonra kendiliğinden kapanır', () => {
    const { result } = renderHook(() => useTypingIndicator('t1'));
    act(() => { handlers['typing:started']({ threadId: 't1' }); });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.isPeerTyping).toBe(false);
  });

  it('unmount olurken typing:stop yayınlar', () => {
    const { result, unmount } = renderHook(() => useTypingIndicator('t1'));
    act(() => { result.current.notifyTyping(); });
    emit.mockClear();
    unmount();
    expect(emit).toHaveBeenCalledWith('typing:stop', { threadId: 't1' });
  });
});
