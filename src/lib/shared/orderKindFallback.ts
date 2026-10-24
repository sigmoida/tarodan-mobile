import { isDigitalOrder, type DigitalOrderSignals } from '@/types';
import { addBreadcrumb } from '@/services/sentry';

/**
 * Leaves a Sentry breadcrumb when an order response carries no `kind` (contract delta
 * 2026-10-23-order-kind): the API is older than the delta and `isDigitalOrder` gates on its
 * `origin` / `isMembership` fallback. A stale API then shows on the next event. Ids only, no PII.
 *
 * Called once per fetch from the order, sale and group detail queries, never per render.
 */
export function noteOrderKindFallback(
  ref: { orderId?: string; groupId?: string },
  orders: ReadonlyArray<DigitalOrderSignals | null | undefined>,
): void {
  const missing = orders.filter((o) => !!o && !(typeof o.kind === 'string' && o.kind !== ''));
  if (missing.length === 0) return;
  addBreadcrumb({
    category: 'order',
    message: 'order.digital.fallback',
    level: 'info',
    data: { ...ref, digital: missing.some((o) => isDigitalOrder(o)) },
  });
}
