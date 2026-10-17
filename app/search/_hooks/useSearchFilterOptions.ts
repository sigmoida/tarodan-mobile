import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { useProductFilterOptions } from '@/hooks/useProductFilterOptions';
import { findManufacturerId } from '@/utils/manufacturerLookup';
import type { ProductFilters } from '@/utils/productFilters';

/**
 * Filtre sayfası seçenekleri + üretici adı → kimlik çözümü (eski `/listings` ekranından taşındı).
 *
 * - Seçili üreticinin slug'ı çözülür ki üreticiye-özel filtreler (HW vb.) yüklensin.
 * - URL'de yalnız üretici ADI varsa (derin bağlantı, push, hero/reklam: `?manufacturer=Hot+Wheels`)
 *   yüklenen üretici listesinden kimlik çözülür — API ad süzgeci yazım/önbellek farkına duyarlı,
 *   kimlik değil. Bulunamazsa / belirsizse ad ile devam. Liste yüklenirken ürün sorgusu
 *   BEKLETİLMELİ (`waitingForManufacturers`) ki önce ad, sonra kimlikle iki istek atılmasın.
 */
export function useSearchFilterOptions(
  filters: ProductFilters,
  setFilters: Dispatch<SetStateAction<ProductFilters>>,
) {
  const baseOptions = useProductFilterOptions();
  const manufacturerSlug = useMemo(() => {
    const list = baseOptions.manufacturers;
    if (filters.manufacturerId) return list.find((m) => m.id === filters.manufacturerId)?.slug;
    if (filters.manufacturer)
      return list.find((m) => m.name.toLowerCase() === filters.manufacturer.toLowerCase())?.slug;
    return undefined;
  }, [filters.manufacturerId, filters.manufacturer, baseOptions.manufacturers]);
  const options = useProductFilterOptions(manufacturerSlug);

  const needsManufacturerId = !!filters.manufacturer && !filters.manufacturerId;
  const resolvedManufacturerId = needsManufacturerId
    ? findManufacturerId(filters.manufacturer, baseOptions.manufacturers)
    : null;
  useEffect(() => {
    if (!resolvedManufacturerId) return;
    setFilters((prev) =>
      prev.manufacturer && !prev.manufacturerId ? { ...prev, manufacturerId: resolvedManufacturerId } : prev,
    );
  }, [resolvedManufacturerId, setFilters]);
  // Kimlik çözüldü ama effect henüz state'e yazmadıysa da bekle (ad-only istek atılmasın).
  const waitingForManufacturers = needsManufacturerId && (!!baseOptions.isLoading || !!resolvedManufacturerId);

  return { options, waitingForManufacturers };
}
