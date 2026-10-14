import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { manufacturersApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { selectWithListings } from '@/utils/catalogListings';

export interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  productCount?: number;
  _count?: { products: number };
}

/**
 * Üreticiler listesi + arama (web `ManufacturersProvider`'ın arama süzgeci). İlanı olmayan
 * üretici listede yok (`hasListings`, anasayfa şeridiyle aynı kural).
 */
export function useManufacturers() {
  const [search, setSearch] = useState('');

  const query = useQuery<Manufacturer[]>({
    queryKey: qk.catalog.manufacturers,
    queryFn: async () => {
      const response = await manufacturersApi.findAll();
      const payload = response.data?.data ?? response.data ?? [];
      return Array.isArray(payload) ? payload : [];
    },
    select: selectWithListings,
  });

  const items = useMemo(() => {
    const all = query.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((m) => m.name.toLowerCase().includes(q)) : all;
  }, [query.data, search]);

  return {
    items,
    hasAny: (query.data ?? []).length > 0,
    search,
    setSearch,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
