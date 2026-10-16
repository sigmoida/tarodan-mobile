// Anahtarın tek kaynağı `@/stores/savedSearchesStorage` (çıkışta oradan silinir).
export { SAVED_SEARCHES_STORAGE_KEY as STORAGE_KEY } from '@/stores/savedSearchesStorage';

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: {
    category?: string;
    brand?: string;
    scale?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    tradeAvailable?: boolean;
  };
  resultCount?: number;
  notifyEnabled: boolean;
  createdAt: string;
  lastRunAt?: string;
}
