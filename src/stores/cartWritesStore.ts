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
  inFlight: string[];
  /** Marks the listing busy; `false` when a write for it already runs (the caller must not start one). */
  begin: (productId: string) => boolean;
  end: (productId: string) => void;
  reset: () => void;
}

export const useCartWritesStore = create<CartWritesState>((set, get) => ({
  inFlight: [],
  begin: (productId) => {
    if (get().inFlight.includes(productId)) return false;
    set({ inFlight: [...get().inFlight, productId] });
    return true;
  },
  end: (productId) => {
    if (!get().inFlight.includes(productId)) return;
    set({ inFlight: get().inFlight.filter((id) => id !== productId) });
  },
  reset: () => set({ inFlight: [] }),
}));
