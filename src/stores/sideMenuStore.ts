import { create } from 'zustand';

/**
 * Yan menü bölümlerinin kapalı/açık durumu — yalnız istemci UI durumu (oturum boyunca hatırlanır,
 * uygulama yeniden açılınca hepsi açık başlar). Varsayılan: hepsi AÇIK.
 */
interface SideMenuState {
  collapsed: Record<string, boolean>;
  toggle: (groupKey: string) => void;
  reset: () => void;
}

export const useSideMenuStore = create<SideMenuState>((set) => ({
  collapsed: {},
  toggle: (groupKey) =>
    set((s) => ({ collapsed: { ...s.collapsed, [groupKey]: !s.collapsed[groupKey] } })),
  reset: () => set({ collapsed: {} }),
}));
