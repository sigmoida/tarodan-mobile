import type { SellerTrustView } from '@/types/seller-trust';

/**
 * `GET /users/:id/profile` body as the seller page reads it. Loose on purpose (index signature,
 * like the product detail DTO) so the gradual `any` migration does not block; `trust` is typed
 * because its null/absent handling is part of the contract (delta 2026-10-21-seller-trust-score):
 * `null` for a non-premium seller, absent on an API without the block.
 */
export interface SellerPublicProfile {
  trust?: SellerTrustView | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the rest of the body is still untyped (backlog)
  [key: string]: any;
}
