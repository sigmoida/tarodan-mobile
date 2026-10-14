import type { SellerProfileController } from '../_hooks/useSellerProfile';

/** Satıcı puan özeti — başlık kartı ve değerlendirmeler kartı aynı kaynaktan okur. */
export function sellerRatingSummary(f: Pick<SellerProfileController, 'seller' | 'ratingStats'>) {
  const { seller, ratingStats } = f;
  const total = Number(ratingStats?.totalRatings ?? ratingStats?.total ?? seller?.stats?.totalRatings ?? 0);
  const average = Number(
    ratingStats?.averageScore ?? ratingStats?.averageRating ?? seller?.stats?.averageRating ?? 0,
  );
  return { total, average, hasRatings: total > 0 };
}
