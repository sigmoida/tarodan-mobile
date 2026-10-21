/**
 * The selection of a paged trade picker: a pick missing from the list is pruned only once every
 * page is loaded; otherwise it stays checked, pinned at the top, and is part of `pickedIds`
 * (the ids the screens send). Mirrors web `usePagedPicks`.
 */
import { act, renderHook } from '@testing-library/react-native';
import { usePagedPicks } from '../_hooks/usePagedPicks';

type Row = { id: string; price?: number };
const rows = (...ids: string[]): Row[] => ids.map((id) => ({ id }));

function setup(initial: { loaded: Row[]; complete: boolean; ready: boolean }) {
  return renderHook((props: typeof initial) => usePagedPicks<Row>(props), { initialProps: initial });
}

describe('usePagedPicks', () => {
  it('toggles rows from the loaded list and lists them in pickedIds', () => {
    const { result } = setup({ loaded: rows('a', 'b'), complete: true, ready: true });
    act(() => result.current.toggle('b'));
    act(() => result.current.toggle('a'));
    expect(result.current.pickedIds).toEqual(['b', 'a']);
    act(() => result.current.toggle('b'));
    expect(result.current.pickedIds).toEqual(['a']);
  });

  it('ignores an unknown id', () => {
    const { result } = setup({ loaded: rows('a'), complete: true, ready: true });
    act(() => result.current.toggle('zzz'));
    expect(result.current.pickedIds).toEqual([]);
  });

  it('prunes a pick that is gone once every page is loaded', () => {
    const { result, rerender } = setup({ loaded: rows('a', 'b'), complete: true, ready: true });
    act(() => result.current.toggle('a'));
    act(() => result.current.toggle('b'));
    rerender({ loaded: rows('b'), complete: true, ready: true });
    expect(result.current.pickedIds).toEqual(['b']);
  });

  it('keeps a pick that is missing while more pages exist, pinned at the top of the rows', () => {
    const { result, rerender } = setup({ loaded: rows('a', 'b'), complete: false, ready: true });
    act(() => result.current.toggle('b'));
    rerender({ loaded: rows('a', 'c'), complete: false, ready: true });
    expect(result.current.pickedIds).toEqual(['b']);
    expect(result.current.rows.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('prunes the pinned pick when the last page loads without it', () => {
    const { result, rerender } = setup({ loaded: rows('a', 'b'), complete: false, ready: true });
    act(() => result.current.toggle('b'));
    rerender({ loaded: rows('a', 'c'), complete: false, ready: true });
    rerender({ loaded: rows('a', 'c'), complete: true, ready: true });
    expect(result.current.pickedIds).toEqual([]);
    expect(result.current.rows.map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('does not prune before the list has settled', () => {
    const { result, rerender } = setup({ loaded: rows('a'), complete: true, ready: true });
    act(() => result.current.toggle('a'));
    rerender({ loaded: [], complete: true, ready: false });
    expect(result.current.pickedIds).toEqual(['a']);
    rerender({ loaded: [], complete: true, ready: true });
    expect(result.current.pickedIds).toEqual([]);
  });

  it('refreshes a pick that is still listed from the latest row', () => {
    const { result, rerender } = setup({ loaded: [{ id: 'a', price: 1 }], complete: true, ready: true });
    act(() => result.current.toggle('a'));
    rerender({ loaded: [{ id: 'a', price: 2 }], complete: true, ready: true });
    expect(result.current.picked[0]?.price).toBe(2);
  });

  it('select() replaces the selection and skips unknown ids; add() is idempotent', () => {
    const { result } = setup({ loaded: rows('a', 'b'), complete: true, ready: true });
    act(() => result.current.select(['b', 'nope', 'a']));
    expect(result.current.pickedIds).toEqual(['b', 'a']);
    act(() => result.current.add({ id: 'a' }));
    act(() => result.current.add({ id: 'c' }));
    expect(result.current.pickedIds).toEqual(['b', 'a', 'c']);
  });
});
