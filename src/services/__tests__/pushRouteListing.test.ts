/**
 * Push tap on a listing notification, end to end through `routeFromNotification`.
 *
 * The API push payload is the flat `{ ...dto.data, type }` (`notification-dispatch.service.ts`):
 * listing types carry `productId` (a uuid) and no `link`; admin broadcasts carry a free `link`
 * (`free("link")` in `notification-link.ts`), which after ADR 0017 may be the canonical
 * `/listings/<slug>-<uuid>`. Whatever shape arrives, the tap must land on the listing uuid, and a
 * target with no uuid must fall back to the notification list instead of a dead screen.
 */
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    dismissTo: (...a: unknown[]) => mockDismissTo(...a),
    navigate: (...a: unknown[]) => mockNavigate(...a),
  },
}));

import { routeFromNotification } from '../push';
import { listingIdFromParam } from '@/lib/product/listingParam';

const ID = '0b1e5c1a-7d2f-4e3a-9c4b-5d6e7f8a9b0c';

/** The listing uuid the product screen will load for the pushed route (`app/product/[id]`). */
function pushedListingId(): string | null {
  expect(mockPush).toHaveBeenCalledTimes(1);
  const route = String(mockPush.mock.calls[0]![0]);
  const match = route.match(/^\/product\/([^/?]+)$/);
  return match ? listingIdFromParam(match[1]) : null;
}

beforeEach(() => {
  mockPush.mockClear();
  mockDismissTo.mockClear();
  mockNavigate.mockClear();
});

describe('routeFromNotification: listing push payloads', () => {
  it.each([
    'price_drop',
    'seller_new_listing',
    'product_liked',
    'wishlist_sold',
    'listing_expiring',
    'listing_views_milestone',
    'product_approved',
  ])('%s (flat payload with productId) opens the product screen', (type) => {
    routeFromNotification({ type, productId: ID, productTitle: 'Ferrari F40' });
    expect(mockPush).toHaveBeenCalledWith(`/product/${ID}`);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('an upper-case productId still lands on the same listing uuid', () => {
    routeFromNotification({ type: 'price_drop', productId: ID.toUpperCase() });
    expect(pushedListingId()).toBe(ID);
  });

  it('an out-of-stock push opens the unavailable screen with the lower-case uuid', () => {
    routeFromNotification({ type: 'order_cancelled_out_of_stock', productId: ID.toUpperCase() });
    expect(mockPush).toHaveBeenCalledWith(`/products/unavailable/${ID}`);
  });

  it.each([
    ['a relative canonical link', `/listings/ferrari-f40-${ID}`],
    ['an absolute canonical link', `https://tarodan.com.tr/listings/ferrari-f40-${ID}`],
    ['a canonical link with a campaign query', `/listings/ferrari-f40-${ID}?utm_source=push`],
    ['a stale slug', `/listings/eski-baslik-${ID}`],
    ['a legacy bare-uuid link', `/listings/${ID}`],
  ])('an admin broadcast with %s opens the product screen', (_label, link) => {
    routeFromNotification({ type: 'admin_broadcast', link });
    expect(mockPush).toHaveBeenCalledWith(`/product/${ID}`);
  });

  it('a broadcast whose listing link holds no uuid falls back to the notification list', () => {
    routeFromNotification({ type: 'admin_broadcast', link: '/listings/garbage' });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/notifications');
  });

  it('push and in-app row of the same listing notification resolve to the same listing', () => {
    // Push: flat payload. In-app row: `link` from the API template `/listings/{{productId}}` plus `data`.
    routeFromNotification({ type: 'price_drop', productId: ID });
    const fromPush = pushedListingId();
    mockPush.mockClear();
    routeFromNotification({ type: 'price_drop', link: `/listings/${ID}` });
    const fromLink = pushedListingId();
    expect(fromPush).toBe(ID);
    expect(fromLink).toBe(ID);
  });
});
