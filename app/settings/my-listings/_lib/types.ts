import type { MessageKey } from '@/i18n/lib';
import { theme } from '@/ui';

const { colors } = theme;

export interface Listing {
  id: string;
  title: string;
  price: number;
  status: 'active' | 'pending' | 'sold' | 'inactive' | 'reserved' | 'rejected' | 'deleted';
  viewCount: number;
  likeCount?: number;
  images: Array<{ url: string }>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  condition: string;
  category?: { name: string };
  boostedUntil?: string | null;
}

export type FilterType =
  | 'all' | 'active' | 'pending' | 'sold' | 'reserved' | 'inactive' | 'rejected' | 'deleted';

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return colors.success[600]!;
    case 'sold': return colors.info[600]!;
    case 'pending': return colors.warning[600]!;
    case 'rejected': return colors.danger[600]!;
    case 'reserved': return colors.primary[600]!;
    case 'inactive': return colors.text.subtle;
    case 'deleted': return colors.danger[600]!;
    default: return colors.text.muted;
  }
};

/**
 * Durumun katalog ANAHTARI — çözülmüş metin değil.
 *
 * Bu modül sabitler taşıyor; burada `t()` çağırmak metni ilk yüklenen dilde
 * dondururdu. Tanınmayan bir durum `null` döner, çağıran ham kodu basar (ekranda
 * boş bir satır kalmasın).
 */
export const statusTextKey = (status: string): MessageKey | null => {
  switch (status) {
    case 'active': return 'listing.filterActive';
    case 'sold': return 'listing.filterSold';
    case 'pending': return 'listing.statusPendingApproval';
    case 'rejected': return 'listing.filterRejected';
    case 'reserved': return 'listing.filterReserved';
    case 'inactive': return 'listing.filterInactive';
    case 'deleted': return 'listing.statusDeleted';
    default: return null;
  }
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR');
};

export const getDaysUntilExpiry = (expiresAt?: string) => {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt);
  const now = new Date();
  const diff = expires.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
