import { logger, safeError } from '@/services/logger';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

export interface FollowedSeller {
  id: string;
  displayName: string;
  avatarUrl?: string;
  listingCount: number;
  rating?: number;
  followedAt: string;
  bio?: string;
}

/**
 * `GET /users/me/following` yanıtını düz satıcı listesine çevirir. API (web ile aynı uç)
 * `{ following: [{ id, followingId, createdAt, following: { id, publicName, displayName,
 * avatarUrl, bio, _count: { products } } }] }` döner; satır `id`'si takip kaydıdır, satıcı
 * kimliği `following.id`'dir. Eski düz dizi / `{ data }` biçimleri de kabul edilir.
 */
interface RawFollowedUser {
  id?: string;
  publicName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  rating?: number | null;
  listingCount?: number;
  followedAt?: string;
  _count?: { products?: number };
}

interface RawFollowRow extends RawFollowedUser {
  followingId?: string;
  createdAt?: string;
  following?: RawFollowedUser | boolean | null;
}

type RawFollowingBody =
  | RawFollowRow[]
  | { following?: RawFollowRow[]; data?: RawFollowRow[] | { following?: RawFollowRow[] } }
  | null
  | undefined;

export function normalizeFollowing(body: RawFollowingBody): FollowedSeller[] {
  const b = body as { following?: unknown; data?: { following?: unknown } } | null | undefined;
  const raw = Array.isArray(body) ? body : (b?.following ?? b?.data?.following ?? b?.data);
  if (!Array.isArray(raw)) return [];
  return (raw as RawFollowRow[])
    .map((row): FollowedSeller | null => {
      const u: RawFollowedUser =
        row?.following && typeof row.following === 'object' ? row.following : row;
      const id = u?.id ?? row?.followingId;
      if (!id) return null;
      return {
        id: String(id),
        displayName: u.publicName || u.displayName || '',
        avatarUrl: u.avatarUrl ?? undefined,
        listingCount: u._count?.products ?? u.listingCount ?? 0,
        rating: typeof u.rating === 'number' ? u.rating : undefined,
        followedAt: row?.createdAt ?? row?.followedAt ?? u.followedAt ?? '',
        bio: u.bio ?? undefined,
      };
    })
    .filter((s): s is FollowedSeller => s !== null);
}

/**
 * Takip edilen satıcılar — React Query destekli. Eskiden `followStore` (fetch
 * eden zustand) yapıyordu; Faz 1'de tek server-state disiplinine (TanStack Query)
 * taşındı ([[mobile-canonical-refactor-progress]] deseni; favorites ile aynı).
 * Davranış birebir korunur: follow/unfollow yerel cache'i günceller (store'da
 * olduğu gibi API DÖNÜŞÜNDEN SONRA — optimistic değil), 409 idempotent, 404
 * toleranslı. Public API (following/isFollowing/followSeller…) store ile aynıdır.
 */
export function useFollowing() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const query = useQuery({
    queryKey: qk.follow.following,
    enabled: isAuthenticated,
    queryFn: async (): Promise<FollowedSeller[]> => {
      const response = await api.get('/users/me/following');
      return normalizeFollowing(response.data);
    },
  });

  const following: FollowedSeller[] = query.data ?? [];

  const readCache = (): FollowedSeller[] =>
    qc.getQueryData<FollowedSeller[]>(qk.follow.following) ?? [];

  const isFollowing = (sellerId: string) => readCache().some((f) => f.id === sellerId);
  const getFollowingCount = () => following.length;

  const fetchFollowing = () => query.refetch();

  const followSeller = async (sellerId: string): Promise<boolean> => {
    try {
      const response = await api.post(`/users/${sellerId}/follow`);
      // API dönüşünden sonra yerel state'e ekle (store paritesi).
      const newFollowing: FollowedSeller = response.data?.user || {
        id: sellerId,
        displayName: t('product.seller'),
        listingCount: 0,
        followedAt: new Date().toISOString(),
      };
      qc.setQueryData<FollowedSeller[]>(qk.follow.following, (cur) => [...(cur ?? []), newFollowing]);
      return true;
    } catch (error: any) {
      logger.error('Failed to follow', { err: safeError(error) });
      // Zaten takip ediliyorsa başarı (idempotent).
      if (error?.response?.status === 409) {
        return true;
      }
      return false;
    }
  };

  const unfollowSeller = async (sellerId: string): Promise<boolean> => {
    try {
      await api.delete(`/users/${sellerId}/follow`);
      qc.setQueryData<FollowedSeller[]>(qk.follow.following, (cur) =>
        (cur ?? []).filter((f) => f.id !== sellerId),
      );
      return true;
    } catch (error: any) {
      logger.error('Failed to unfollow', { err: safeError(error) });
      // Takip edilmiyorsa yine başarı + yerel listeden düş.
      if (error?.response?.status === 404) {
        qc.setQueryData<FollowedSeller[]>(qk.follow.following, (cur) =>
          (cur ?? []).filter((f) => f.id !== sellerId),
        );
        return true;
      }
      return false;
    }
  };

  return {
    following,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.isError ? t('following.loadFailed') : null,
    isFollowing,
    getFollowingCount,
    fetchFollowing,
    followSeller,
    unfollowSeller,
  };
}
