/**
 * Takas geri sayımı: saniyelik tik yalnız son tarih varken (ve dolmamışken) kurulur; ekranın
 * tepesinde değil, kalan süreyi gösteren karttadır.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useCountdown } from '../[id]/_hooks/useCountdown';

describe('useCountdown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('son tarih yoksa interval kurmaz (render tetiklemez)', () => {
    const spy = jest.spyOn(global, 'setInterval');
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useCountdown(null);
    });
    act(() => jest.advanceTimersByTime(5000));
    expect(spy).not.toHaveBeenCalled();
    expect(renders).toBe(1);
    spy.mockRestore();
  });

  it('geçmiş son tarihte tıklamaz', () => {
    const spy = jest.spyOn(global, 'setInterval');
    renderHook(() => useCountdown(new Date(Date.now() - 1000).toISOString()));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('gelecekteki son tarihte saniyede bir ilerler, dolunca durur', () => {
    const deadline = new Date(Date.now() + 3000).toISOString();
    const { result } = renderHook(() => useCountdown(deadline));
    const start = result.current;
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current).toBeGreaterThanOrEqual(start + 1000);
    act(() => jest.advanceTimersByTime(5000));
    const after = result.current;
    act(() => jest.advanceTimersByTime(5000));
    // Süre dolduktan sonra interval temizlenir → `now` sabit kalır.
    expect(result.current).toBe(after);
  });
});
