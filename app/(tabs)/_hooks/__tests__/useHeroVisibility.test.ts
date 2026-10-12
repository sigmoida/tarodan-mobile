import { act, renderHook } from '@testing-library/react-native';
import { useHeroVisibility } from '../useHeroVisibility';

const scroll = (y: number) => ({ nativeEvent: { contentOffset: { y } } }) as any;
const layout = (l: { y?: number; height: number }) => ({ nativeEvent: { layout: { x: 0, y: 0, width: 0, ...l } } }) as any;

describe('useHeroVisibility', () => {
  it('kaydırma ofsetine göre görünürlüğü türetir', () => {
    const { result } = renderHook(() => useHeroVisibility());
    act(() => {
      result.current.onViewportLayout(layout({ height: 800 }));
      result.current.onHeroLayout(layout({ y: 100, height: 400 }));
    });
    expect(result.current.visible).toBe(true);

    act(() => result.current.onScroll(scroll(600)));
    expect(result.current.visible).toBe(false);

    act(() => result.current.onScroll(scroll(0)));
    expect(result.current.visible).toBe(true);
  });

  it('sonuç değişmedikçe yeniden çizim tetiklemez', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useHeroVisibility();
    });
    act(() => {
      result.current.onViewportLayout(layout({ height: 800 }));
      result.current.onHeroLayout(layout({ y: 100, height: 400 }));
    });
    const before = renders;
    act(() => result.current.onScroll(scroll(10)));
    act(() => result.current.onScroll(scroll(20)));
    expect(renders).toBe(before);
  });
});
