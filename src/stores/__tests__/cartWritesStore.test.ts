/**
 * The app-wide card cart write lock (`useCartWritesStore`): one running write per listing, a
 * token per write, and a reset that a write from the previous session cannot undo.
 */
import { selectCartWriteBusy, useCartWritesStore } from '../cartWritesStore';

const store = () => useCartWritesStore.getState();

beforeEach(() => store().reset());

describe('useCartWritesStore', () => {
  it('a second write for a running listing is refused; other listings are not affected', () => {
    const token = store().begin('p1');
    expect(token).not.toBeNull();
    expect(store().begin('p1')).toBeNull();
    expect(store().begin('p2')).not.toBeNull();
    expect(selectCartWriteBusy('p1')(store())).toBe(true);
    expect(selectCartWriteBusy('p3')(store())).toBe(false);
  });

  it('end frees the listing only for the token that began it', () => {
    const token = store().begin('p1')!;
    store().end('p1', token + 1000);
    expect(selectCartWriteBusy('p1')(store())).toBe(true);
    store().end('p1', token);
    expect(selectCartWriteBusy('p1')(store())).toBe(false);
    expect(store().begin('p1')).not.toBeNull();
  });

  it('every write gets a new token, also after a reset', () => {
    const stale = store().begin('p1')!;
    store().reset();
    const fresh = store().begin('p1')!;
    expect(fresh).not.toBe(stale);
    store().end('p1', stale);
    expect(selectCartWriteBusy('p1')(store())).toBe(true);
  });

  it('ending a listing that is not running changes nothing', () => {
    const token = store().begin('p1')!;
    const before = store().inFlight;
    store().end('p2', token);
    expect(store().inFlight).toBe(before);
  });

  it.each(['constructor', 'toString', 'hasOwnProperty'])(
    'a listing id named like an object key ("%s") is not busy until it writes',
    (id) => {
      expect(selectCartWriteBusy(id)(store())).toBe(false);
      const token = store().begin(id);
      expect(token).not.toBeNull();
      expect(selectCartWriteBusy(id)(store())).toBe(true);
      store().end(id, token!);
      expect(selectCartWriteBusy(id)(store())).toBe(false);
    },
  );
});
