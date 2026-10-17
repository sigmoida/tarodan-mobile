import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { api, categoriesApi } from '@/lib/api';
import { unwrapList } from '@/lib/api/unwrap';
import { qk } from '@/lib/query';

import { BRAND_SLUGS, FALLBACK_SCALES, SCALE_SLUGS, buildMaterials } from '../_lib/constants';
import type { Brand, CarModel, Category, ColorOption, Manufacturer, MaterialOption } from '../_lib/types';

/** Katalog seçenekleri az değişir; filtre/kategori ekranlarıyla aynı tazelik. */
const CATALOG_STALE_MS = 10 * 60 * 1000;

// Sabit boş diziler: `?? []` her render'da yeni referans üretip memo'lu bölümleri boşa çizdirirdi.
const NO_CATEGORIES: Category[] = [];
const NO_BRANDS: Brand[] = [];
const NO_MODELS: CarModel[] = [];
const NO_MANUFACTURERS: Manufacturer[] = [];
const NO_COLORS: ColorOption[] = [];

type FiltersResponse = {
  scales?: string[];
  materials?: MaterialOption[];
  colors?: ColorOption[];
  brands?: Brand[];
  manufacturers?: Manufacturer[];
};

/** Sorgu hataya düştüğünde bir kez toast (eski `fetch*` catch dallarıyla aynı metinler). */
function useErrorToast(isError: boolean, message: string) {
  useEffect(() => {
    if (isError) toast.error(message);
  }, [isError, message]);
}

const flattenCategories = (cats: Category[]): Category[] => {
  const result: Category[] = [];
  cats.forEach((cat) => {
    result.push(cat);
    if (cat.children?.length) result.push(...flattenCategories(cat.children));
  });
  return result;
};

/**
 * İlan formunun katalog verisi — React Query (eskiden useState + api.get, her açılışta yeniden
 * çekiliyordu, önbellek yoktu).
 *
 * - Kategori ağacı: `qk.catalog.categories` — Kategoriler ekranı / filtre seçenekleriyle AYNI
 *   anahtar ve gövde (`unwrapList(GET /categories)`), kalıcı önbellekte.
 * - Filtre seçenekleri: `qk.products.filterOptions('')` — `useProductFilterOptions` ile AYNI
 *   anahtar ve AYNI istek (`GET /products/filters`, üreticisiz; gövde olduğu gibi). O kanca
 *   `colors`'ı döndürmediği ve kategorileri düzleştirdiği için doğrudan kullanılmıyor.
 * - Modeller: markaya göre `qk.catalog.carModels({ brand })`.
 *
 * `enabled`: yalnız oturum açıkken (eski davranış: giriş yokken istek atılmazdı).
 */
export function useListingCatalog({ enabled, brandId }: { enabled: boolean; brandId: string }) {
  const { t } = useTranslation();

  const categoriesQuery = useQuery({
    queryKey: qk.catalog.categories,
    queryFn: async () => unwrapList<Category>((await categoriesApi.getAll()).data),
    staleTime: CATALOG_STALE_MS,
    enabled,
  });
  useErrorToast(categoriesQuery.isError, t('listing.categoriesLoadFailed'));

  const filtersQuery = useQuery({
    queryKey: qk.products.filterOptions(''),
    queryFn: async () => (await api.get('/products/filters')).data as FiltersResponse,
    staleTime: CATALOG_STALE_MS,
    enabled,
  });
  useErrorToast(filtersQuery.isError, t('listing.filtersLoadFailed'));

  const filters = filtersQuery.data;
  const brands = filters?.brands?.length ? filters.brands : NO_BRANDS;
  const manufacturerList = filters?.manufacturers?.length ? filters.manufacturers : NO_MANUFACTURERS;
  const colorList = filters?.colors?.length ? filters.colors : NO_COLORS;
  const scaleList = filters?.scales;
  const materialList = filters?.materials;
  const effectiveScales = scaleList?.length ? scaleList : FALLBACK_SCALES;
  const effectiveMaterials = useMemo(
    () => (materialList?.length ? materialList : buildMaterials(t)),
    [materialList, t],
  );

  const categories = categoriesQuery.data ?? NO_CATEGORIES;
  const flatCategories = useMemo(
    () =>
      flattenCategories(categories).filter(
        (c) => !BRAND_SLUGS.includes(c.slug) && !SCALE_SLUGS.includes(c.slug),
      ),
    [categories],
  );

  // Model listesi seçili markanın slug'ına göre; marka listesi gelmeden slug bilinmez (eski
  // davranış: o arada istek atılmaz).
  const brandSlug = brandId ? brands.find((b) => b.id === brandId)?.slug : undefined;
  const modelsQuery = useQuery({
    queryKey: qk.catalog.carModels({ brand: brandSlug }),
    queryFn: async (): Promise<CarModel[]> => {
      const res = await api.get('/car-models', { params: { brand: brandSlug } });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
    staleTime: CATALOG_STALE_MS,
    enabled: !!brandSlug,
  });
  useErrorToast(modelsQuery.isError, t('listing.modelsLoadFailed'));

  return {
    flatCategories,
    brands,
    manufacturerList,
    colorList,
    effectiveScales,
    effectiveMaterials,
    // Eski `brandsLoading` ilk yanıt (başarılı/başarısız) gelene dek `true` idi.
    brandsLoading: filtersQuery.isPending,
    models: brandId && modelsQuery.data ? modelsQuery.data : NO_MODELS,
    modelsLoading: !!brandSlug && modelsQuery.isLoading,
  };
}
