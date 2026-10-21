/**
 * Contract fixture test for tarodan-ops `contracts/deltas/2026-10-21-saved-searches.md`: the
 * `SavedSearch` item and list envelope, the 409 / 403 refusal bodies (`errorCode`, top-level
 * `limit`), the routes the client calls, and the vendored helpers (`src/types/saved-search.ts`)
 * round-tripping the stored query. The fixtures are written from the delta, not measured.
 */
jest.mock('../client', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

import { api } from '../client';
import { INVALID_PATH_SEGMENT } from '../path';
import { savedSearchesApi } from '../savedSearches';
import { savedSearchRefusal } from '../savedSearchRefusal';
import {
  SAVED_SEARCH_ERROR_CODES,
  SAVED_SEARCH_NAME_MAX,
  SAVED_SEARCH_QUERY_KEYS,
  canonicalizeSavedSearchQuery,
  isEmptySavedSearchQuery,
  savedSearchToRouteParams,
  type SavedSearch,
} from '@/types';
import { filtersFromSearchParams } from '@/utils/productFilters';

const item: SavedSearch = {
  id: '9b2f0c1e-5a43-4e0b-9d57-1b7c3e3f6a10',
  name: 'bmw · Diecast',
  query: {
    categoryId: '5f0e9a2c-6f1d-4c53-8e4a-0c9d2b7a1e11',
    color: 'black,red',
    search: 'bmw',
    sortBy: 'price_asc',
    tradeOnly: true,
  },
  labels: { categoryId: 'Diecast' },
  createdAt: '2026-10-21T10:00:00.000Z',
};
const listEnvelope = { data: [item], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } };

describe('saved-searches contract', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the three routes of the delta', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: listEnvelope });
    (api.post as jest.Mock).mockResolvedValue({ data: item });
    (api.delete as jest.Mock).mockResolvedValue({ data: undefined });

    await savedSearchesApi.list(2);
    expect(api.get).toHaveBeenCalledWith('/saved-searches', { params: { page: 2, limit: 100 } });

    const body = { name: 'x', query: { search: 'bmw' }, labels: {} };
    await savedSearchesApi.create(body);
    expect(api.post).toHaveBeenCalledWith('/saved-searches', body);

    await savedSearchesApi.remove(item.id);
    expect(api.delete).toHaveBeenCalledWith(`/saved-searches/${item.id}`);
    // A path segment is validated: an id from a deep link cannot redirect the request.
    await savedSearchesApi.remove('../users/me');
    expect(api.delete).toHaveBeenLastCalledWith(`/saved-searches/${INVALID_PATH_SEGMENT}`);
  });

  it('the stored query is canonical: re-canonicalising changes nothing, it is not empty, a sort alone is', () => {
    expect(canonicalizeSavedSearchQuery(item.query)).toEqual(item.query);
    expect(isEmptySavedSearchQuery(item.query)).toBe(false);
    expect(isEmptySavedSearchQuery({ sortBy: 'price_asc' })).toBe(true);
    // Old mobile names and paging are dropped by the contract helper.
    expect(canonicalizeSavedSearchQuery({ q: 'bmw', tradeAvailable: true, page: 2, limit: 24 })).toEqual({});
  });

  it('running a saved search emits the names /search reads and the search screen reads them all back', () => {
    const params = savedSearchToRouteParams(item.query, item.labels);
    expect(params).toEqual({
      categoryId: item.query.categoryId,
      category: 'Diecast',
      color: 'black,red',
      search: 'bmw',
      sortBy: 'price_asc',
      tradeOnly: 'true',
    });
    expect(filtersFromSearchParams(params)).toMatchObject({
      search: 'bmw',
      categoryId: item.query.categoryId,
      category: 'Diecast',
      colors: ['black', 'red'],
      tradeOnly: true,
      sortBy: 'price_asc',
    });
  });

  it('every key the contract saves is one the search screen reads back (filter-model parity)', () => {
    const everyKey = {
      search: 'a', categoryId: 'c', brandId: 'b', brand: 'B', manufacturerId: 'm', manufacturer: 'M',
      carModelId: 'cm', scale: '1:18', material: 'metal', color: 'red', condition: 'new', minPrice: 1,
      maxPrice: 2, tradeOnly: true, discountOnly: true, preOrder: true, limited: true, set: true,
      attrGroups: JSON.stringify({ g: ['a'] }), sortBy: 'price_asc',
    } as const;
    expect(Object.keys(everyKey).sort()).toEqual([...SAVED_SEARCH_QUERY_KEYS].sort());
    const read = filtersFromSearchParams(savedSearchToRouteParams(canonicalizeSavedSearchQuery(everyKey)));
    expect(read).toMatchObject({
      search: 'a', categoryId: 'c', brandId: 'b', brand: 'B', manufacturerId: 'm', manufacturer: 'M',
      carModelId: 'cm', scale: '1:18', material: 'metal', colors: ['red'], condition: 'new',
      minPrice: '1', maxPrice: '2', tradeOnly: true, discountOnly: true, preOrder: true, limited: true,
      set: true, customAttributes: { g: ['a'] }, sortBy: 'price_asc',
    });
  });

  it('refusals are told apart by errorCode, never by the status alone', () => {
    const e = (status: number, data: Record<string, unknown>) => ({ response: { status, data } });
    expect(savedSearchRefusal(e(409, { errorCode: 'SAVED_SEARCH_DUPLICATE', i18nKey: 'server.savedSearch.alreadySaved' }))).toEqual({
      kind: 'duplicate',
    });
    expect(
      savedSearchRefusal(e(403, { errorCode: 'SAVED_SEARCH_LIMIT', i18nKey: 'server.savedSearch.limitReached', limit: 10 })),
    ).toEqual({ kind: 'limit', limit: 10 });
    // `limit` is a top-level number; anything else reads as "unknown" (the screen shows the message).
    expect(savedSearchRefusal(e(403, { errorCode: 'SAVED_SEARCH_LIMIT', limit: '10' }))).toEqual({ kind: 'limit', limit: null });
    // Other 403s: a ban, an account deleted meanwhile (no errorCode), and other statuses.
    expect(savedSearchRefusal(e(403, { errorCode: 'USER_BANNED' }))).toBeNull();
    expect(savedSearchRefusal(e(403, { i18nKey: 'server.auth.accountDeleted' }))).toBeNull();
    expect(savedSearchRefusal(e(400, { message: ['query.minPrice must not be less than 0'] }))).toBeNull();
    expect(savedSearchRefusal(new Error('Network Error'))).toBeNull();
    expect(savedSearchRefusal(null)).toBeNull();
    expect(SAVED_SEARCH_ERROR_CODES).toEqual({ limitReached: 'SAVED_SEARCH_LIMIT', duplicate: 'SAVED_SEARCH_DUPLICATE' });
  });

  it('the name limit of the contract is 60', () => {
    expect(SAVED_SEARCH_NAME_MAX).toBe(60);
  });
});
