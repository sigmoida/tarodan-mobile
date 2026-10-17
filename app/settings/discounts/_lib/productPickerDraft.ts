import { create } from 'zustand';

/**
 * Ürün seçici TASLAĞI (route-yerel, yalnız UI durumu — src/stores/CLAUDE.md › Client state only). İndirim
 * formu ekranı ile `products` ekranı arasında seçili ürünleri taşır:
 *
 *   form: `open(mevcutIds)` → push('/settings/discounts/products')
 *   products: `toggle(id)` (canlı; eski modal gibi her dokunuş anında geçerli)
 *   form odağa dönünce: `consume()` → seçim forma yazılır, taslak kapanır.
 *
 * Route param yerine store: seçim listesi 100 ürüne kadar çıkabiliyor ve geri
 * dönüşte (geri oku / Android geri / "Tamam") aynı yoldan okunmalı.
 */
interface ProductPickerDraft {
  /** Form bir seçim oturumu başlattı mı (dönüşte `consume` bunu okur). */
  active: boolean;
  selectedIds: string[];
  open: (ids: string[]) => void;
  toggle: (id: string) => void;
  /** Açık oturumun seçimini döndürüp kapatır; oturum yoksa `null`. */
  consume: () => string[] | null;
}

export const useProductPickerDraft = create<ProductPickerDraft>((set, get) => ({
  active: false,
  selectedIds: [],
  open: (ids) => set({ active: true, selectedIds: [...ids] }),
  toggle: (id) =>
    set(({ selectedIds }) => ({
      selectedIds: selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    })),
  consume: () => {
    const { active, selectedIds } = get();
    if (!active) return null;
    set({ active: false });
    return selectedIds;
  },
}));
