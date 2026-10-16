/**
 * Web SidebarFilters'ın yaptığı gibi /products/filters + /categories'ten filtre
 * seçeneklerini yükler. Tüm filtre ekranları bu hook'u paylaşır.
 */
import { useQuery } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/lib/api';
import { unwrapList } from '@/lib/api/unwrap';
import { qk } from '@/lib/query';

export type FilterCategory = { id: string; name: string; slug: string };
export type FilterBrand = { id: string; name: string; slug: string };
export type FilterManufacturer = { id: string; name: string; slug: string };
export type FilterMaterial = { slug: string; label: string };
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
  scales: string[];
  materials: FilterMaterial[];
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

export function useProductFilterOptions(manufacturerSlug?: string): ProductFilterOptions {
  const filtersQuery = useQuery({
    queryKey: ['product-filters', manufacturerSlug ?? ''],
    queryFn: async () => {
      const res = await productsApi.getFilters(
        manufacturerSlug ? { manufacturer: manufacturerSlug } : undefined,
      );
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    // Kategori ağacının TEK anahtarı (Kategoriler ekranıyla paylaşılır: GET /categories bir kez çekilir).
    queryKey: qk.catalog.categories,
    queryFn: async () => {
      const res = await categoriesApi.getAll();
      return unwrapList<{ id: string; name: string; slug: string }>(res.data);
    },
    staleTime: 10 * 60 * 1000,
  });

  const data = filtersQuery.data;

  // /products/filters categories: { value, label, slug } → { id, name, slug }
  const categoriesFromFilters: FilterCategory[] = (data?.categories ?? []).map((c) => ({
    id: c.value,
    name: c.label,
    slug: c.slug,
  }));

  const categories: FilterCategory[] =
    categoriesQuery.data && categoriesQuery.data.length > 0
      ? categoriesQuery.data.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
      : categoriesFromFilters;

  return {
    categories,
    brands: data?.brands ?? [],
    manufacturers: data?.manufacturers ?? [],
    // Sunucu 16'lık sabit ölçek listesini KALDIRDI: boş dizi artık meşru bir
    // yanıt ("katalogda ölçek yok"), hata değil. Eskiden boş görünce istemci
    // listesi konuyordu ve kullanıcı katalogda karşılığı olmayan bir ölçekle
    // filtreleyip sıfır sonuç alıyordu — uydurulmuş seçenek boş listeden kötü.
    // Yanıt hiç gelmediyse (yükleniyor/hata) da boş: ekran `isLoading` ile
    // ayırıyor, filtre bölümü boş listeye dayanıklı.
    scales: data?.scales ?? [],
    materials: data?.materials ?? [],
    customAttributes: data?.customAttributes ?? [],
    isLoading: filtersQuery.isLoading,
    isError: filtersQuery.isError,
    refetch: filtersQuery.refetch,
  };
}
