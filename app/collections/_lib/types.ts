import type { CollectionItemSummary } from '@/types';

/**
 * `GET /collections/:id` as the detail and edit screens read it (one shape for both, because they
 * share one cache entry: `qk.collections.detail(id)`). Fields the screens do not show are left off.
 */
export interface CollectionDetail {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  /** Older answers carry the cover under this name. */
  coverImage?: string | null;
  isPublic: boolean;
  viewCount: number;
  likeCount?: number;
  isLiked?: boolean;
  userId?: string;
  userName?: string;
  items: CollectionItemSummary[];
  createdAt?: string;
}
