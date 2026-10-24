/**
 * Web SidebarFilters'ın yaptığı gibi /products/filters + /categories'ten filtre
 * seçeneklerini yükler. Tüm filtre ekranları bu hook'u paylaşır.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/lib/api';
import { unwrapList } from '@/lib/api/unwrap';
import { qk } from '@/lib/query';

export type FilterCategory = { id: string; name: string; slug: string };
export type FilterBrand = { id: string; name: string; slug: string };
export type FilterManufacturer = { id: string; name: string; slug: string };
export type FilterCarModel = { id: string; name: string; slug: string; brandId: string };
export type FilterMaterial = { slug: string; label: string };
/** `color` is the hex swatch served by the catalog (data, not a theme colour). */
export type FilterColor = { slug: string; label: string; color: string | null };
export type FilterCustomAttribute = { slug: string; label: string; color: string | null };
export type FilterCustomAttributeGroup = {
  slug: string;
  name: string;
  /** `null` = genel özel grup (üreticiden bağımsız, ör. Nadirlik); dolu = o üreticiye bağlı. */
  manufacturerSlug: string | null;
  attributes: FilterCustomAttribute[];
};

export type ProductFilterOptions = {
  categories: FilterCategory[];
  brands: FilterBrand[];
  manufacturers: FilterManufacturer[];
  /** All car models; the sheet narrows them by the selected brand (web `modelsForBrand`). */
  carModels: FilterCarModel[];
  scales: string[];
  materials: FilterMaterial[];
  /** Colours of the global "color" attribute group (multi-select in the sheet). */
  colors: FilterColor[];
  /**
   * Özel attribute grupları: genel olanlar (`manufacturerSlug: null`) her zaman,
   * seçili üreticiye bağlı olanlar (örn Hot Wheels) üretici seçilince eklenir.
   */
  customAttributes: FilterCustomAttributeGroup[];
  isLoading: boolean;
  /** `/products/filters` sorgusu hata verdi mi (ölçek/marka/üretici seçenekleri yok). */
  isError?: boolean;
  /** Filtre seçeneklerini yeniden yükler (ekranın "tekrar dene"si; tanımsız olabilir — mock'lar). */
  refetch?: () => void;
};

/** Yanıt yokken kararlı boş liste (her render'da yeni `[]` memo'ları bozmasın). */
const NO_OPTIONS: never[] = [];

export function useProductFilterOptions(
  manufacturerSlug?: string,
  { enabled = true }: { enabled?: boolean } = {},
): ProductFilterOptions {
  const filtersQuery = useQuery({
    queryKey: qk.products.filterOptions(manufacturerSlug ?? ''),
    queryFn: async () => {
      const res = await productsApi.getFilters(
        manufacturerSlug ? { manufacturer: manufacturerSlug } : undefined,
      );
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    enabled,
  });

  const categoriesQuery = useQuery({
    // Kategori ağacının TEK anahtarı (Kategoriler ekranıyla paylaşılır: GET /categories bir kez çekilir).
    queryKey: qk.catalog.categories,
    queryFn: async () => {
      const res = await categoriesApi.getAll();
      return unwrapList<{ id: string; name: string; slug: string }>(res.data);
    },
    staleTime: 10 * 60 * 1000,
    enabled,
  });

  const data = filtersQuery.data;

  // Kimliği kararlı: tüketiciler (arama çipleri) bunu memo bağımlılığı olarak kullanır.
  const categories: FilterCategory[] = useMemo(
    () =>
      categoriesQuery.data && categoriesQuery.data.length > 0
        ? categoriesQuery.data.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
        : // /products/filters categories: { value, label, slug } → { id, name, slug }
          (data?.categories ?? []).map((c) => ({ id: c.value, name: c.label, slug: c.slug })),
    [categoriesQuery.data, data?.categories],
  );

  return {
    categories,
    brands: data?.brands ?? NO_OPTIONS,
    manufacturers: data?.manufacturers ?? NO_OPTIONS,
    carModels: data?.carModels ?? NO_OPTIONS,
    // Sunucu 16'lık sabit ölçek listesini KALDIRDI: boş dizi artık meşru bir
    // yanıt ("katalogda ölçek yok"), hata değil. Eskiden boş görünce istemci
    // listesi konuyordu ve kullanıcı katalogda karşılığı olmayan bir ölçekle
    // filtreleyip sıfır sonuç alıyordu — uydurulmuş seçenek boş listeden kötü.
    // Yanıt hiç gelmediyse (yükleniyor/hata) da boş: ekran `isLoading` ile
    // ayırıyor, filtre bölümü boş listeye dayanıklı.
    scales: data?.scales ?? [],
    materials: data?.materials ?? [],
    colors: data?.colors ?? NO_OPTIONS,
    customAttributes: data?.customAttributes ?? [],
    isLoading: filtersQuery.isLoading,
    isError: filtersQuery.isError,
    refetch: filtersQuery.refetch,
  };
}
