/**
 * Bir yorumun yazarının kullanıcı id'si — yorumcu adını profiline bağlamak için
 * (şikayet ve engelleme profildeki ⋮ menüsünde; Apple 1.2 yorumları da UGC sayar).
 *
 * İki DTO şekli (2026-09-29 production ölçümü):
 * - ürün yorumu (`GET /ratings/products/:id`): `userId`, `user.id`
 * - satıcı yorumu (`GET /ratings/users/:id`): `giverId`, `giver.id`
 */
type ReviewLike = {
  userId?: string | null;
  user?: { id?: string | null } | null;
  giverId?: string | null;
  giver?: { id?: string | null } | null;
  reviewer?: { id?: string | null } | null;
} | null | undefined;

export function reviewAuthorId(review: ReviewLike | Record<string, unknown>): string | null {
  const r = review as Exclude<ReviewLike, null | undefined> | null | undefined;
  return r?.user?.id ?? r?.userId ?? r?.giver?.id ?? r?.giverId ?? r?.reviewer?.id ?? null;
}
