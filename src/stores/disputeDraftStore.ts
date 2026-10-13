import { create } from 'zustand';

/**
 * Takas itirazı açıklama taslakları (takas id → metin). Yalnız istemci/UI durumu
 * (CLAUDE.md §8), bellek içi: itiraz ekranından çıkıp geri gelen kullanıcı yazdığını
 * kaybetmez; başarılı gönderimde silinir, çıkışta (`resetUserStores`) temizlenir.
 */
interface DisputeDraftState {
  drafts: Record<string, string>;
  setDraft: (tradeId: string, text: string) => void;
  clearDraft: (tradeId: string) => void;
  clearAll: () => void;
}

export const useDisputeDraftStore = create<DisputeDraftState>()((set) => ({
  drafts: {},
  setDraft: (tradeId, text) => set((s) => ({ drafts: { ...s.drafts, [tradeId]: text } })),
  clearDraft: (tradeId) =>
    set((s) => {
      const { [tradeId]: _removed, ...rest } = s.drafts;
      return { drafts: rest };
    }),
  clearAll: () => set({ drafts: {} }),
}));
