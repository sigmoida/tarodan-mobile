import { create } from 'zustand';

/**
 * Listings whose card cart write (add or remove) is running, app-wide and in memory only. The
 * same listing can sit on two cards of one screen (two home rails), or a card can unmount and
 * mount again (FlashList) while its write runs: every card of that listing reads `busy` from here,
 * so a second press never starts a write that races the first on the server, and the card shows
 * why the press does nothing. Reset on logout (`resetUserStores`); a write ends within the API
 * client timeout, so an entry never stays for the session.
 */
interface CartWritesState {
  /** Listing id -> the token of its running write. */
  inFlight: Record<string, number>;
  /**
   * Marks the listing busy and returns the write's token, or `null` when a write for it already
   * runs (the caller must not start one).
   */
  begin: (productId: string) => number | null;
  /** Ends the write `token` started; a write that outlived a reset never ends a newer one. */
  end: (productId: string, token: number) => void;
  reset: () => void;
}

let nextToken = 1;

/** Own keys only: a listing id such as `constructor` is not on the object's prototype chain here. */
const has = (inFlight: Record<string, number>, productId: string) =>
  Object.prototype.hasOwnProperty.call(inFlight, productId);

export const useCartWritesStore = create<CartWritesState>((set, get) => ({
  inFlight: {},
  begin: (productId) => {
    if (has(get().inFlight, productId)) return null;
    const token = nextToken++;
    set({ inFlight: { ...get().inFlight, [productId]: token } });
    return token;
  },
  end: (productId, token) => {
    if (get().inFlight[productId] !== token) return;
    const { [productId]: _ended, ...rest } = get().inFlight;
    set({ inFlight: rest });
  },
  reset: () => set({ inFlight: {} }),
}));

/** Whether a card cart write for the listing runs (a per-listing selector). */
export const selectCartWriteBusy = (productId: string) => (s: CartWritesState) => has(s.inFlight, productId);
