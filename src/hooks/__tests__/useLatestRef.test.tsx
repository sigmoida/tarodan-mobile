/**
 * B4 inceleme 2 · 3: ref ataması render sırasında değil, commit sonrasında
 * (`useLayoutEffect`) yapılır; olay işleyicisi her zaman son commit'i görür.
 */
import { renderHook } from '@testing-library/react-native';
import { useLatestRef } from '@/hooks/useLatestRef';

describe('useLatestRef', () => {
  it('ilk değeri hemen taşır', () => {
    const { result } = renderHook(() => useLatestRef('a'));
    expect(result.current.current).toBe('a');
  });

  it('render sırasında ESKİ değeri, commit sonrasında YENİ değeri gösterir', () => {
    const seenDuringRender: string[] = [];
    const { result, rerender } = renderHook(({ v }: { v: string }) => {
      const ref = useLatestRef(v);
      seenDuringRender.push(ref.current);
      return ref;
    }, { initialProps: { v: 'a' } });

    rerender({ v: 'b' });
    // Render sırasında ref henüz güncellenmemiş (saf render) …
    expect(seenDuringRender).toEqual(['a', 'a']);
    // … commit'ten sonra güncel.
    expect(result.current.current).toBe('b');
  });

  it('aynı ref nesnesi korunur (bağımlılık listelerine girebilir)', () => {
    const { result, rerender } = renderHook(({ v }: { v: number }) => useLatestRef(v), {
      initialProps: { v: 1 },
    });
    const first = result.current;
    rerender({ v: 2 });
    expect(result.current).toBe(first);
  });
});
