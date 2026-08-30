/**
 * Web SidebarFilters'ın yaptığı gibi /products/filters + /categories'ten filtre
 * seçeneklerini yükler. Tüm filtre ekranları bu hook'u paylaşır.
 */
import { useQuery } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/lib/api';

export type FilterCategory = { id: string; name: string; slug: string };
export type FilterBrand = { id: string; name: string; slug: string };
export type FilterManufacturer = { id: string; name: string; slug: string };
export type FilterCarModel = { id: string; name: string; slug: string; brandId: string };
export type FilterMaterial = { slug: string; label: string };
export type FilterCustomAttribute = { slug: string; label: string; color: string | null };
export type FilterCustomAttributeGroup = {
  slug: string;
  name: string;
  manufacturerSlug: string;
  attributes: FilterCustomAttribute[];
};

export type ProductFilterOptions = {
  categories: FilterCategory[];
  brands: FilterBrand[];
  manufacturers: FilterManufacturer[];
  carModels: FilterCarModel[];
  scales: string[];
  materials: FilterMaterial[];
  /** Seçili üreticiye-özel attribute grupları (örn Hot Wheels). Üretici seçilmezse boş. */
  customAttributes: FilterCustomAttributeGroup[];
  isLoading: boolean;
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
    queryKey: ['filter-categories'],
    queryFn: async () => {
      const res = await categoriesApi.getAll();
      const raw = res.data as any;
      const list = Array.isArray(raw) ? raw : raw?.data ?? [];
      return list as Array<{ id: string; name: string; slug: string }>;
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
    carModels: data?.carModels ?? [],
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
  };
}
