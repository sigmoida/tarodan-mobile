/**
 * The draft behind "Save this search": the live filters become the canonical `GET /products` query
 * (the same object `buildListParams` sends, minus `page` / `limit`), labels come from the filters or,
 * for an id-only deep link, from the loaded option lists, and the empty rule and default name are
 * the vendored contract's.
 */
import { canonicalizeSavedSearchQuery, savedSearchToRouteParams } from '@/types';
import { buildListParams, EMPTY_FILTERS, filtersFromSearchParams, type ProductFilters } from '@/utils/productFilters';
import { buildSavedSearchDraft, toCreateSavedSearchInput } from '../_lib/savedSearch';
import { PAGE_SIZE } from '../_lib/searchConstants';

const filters = (over: Partial<ProductFilters> = {}): ProductFilters => ({ ...EMPTY_FILTERS, ...over });

describe('buildSavedSearchDraft', () => {
  it('an untouched search, and a sort alone, are empty (cannot be saved)', () => {
    expect(buildSavedSearchDraft(filters(), {}).isEmpty).toBe(true);
    expect(buildSavedSearchDraft(filters({ sortBy: 'price_asc' }), {}).isEmpty).toBe(true);
    expect(buildSavedSearchDraft(filters({ search: '   ' }), {}).isEmpty).toBe(true);
  });

  it('the query is what the list sends minus page and limit, in canonical form', () => {
    const f = filters({
      search: ' bmw ',
      colors: ['red', 'black'],
      minPrice: '0',
      maxPrice: '500',
      tradeOnly: true,
      customAttributes: { series: ['sx', 'gt'], empty: [] },
      sortBy: 'created_desc',
    });
    const { query, isEmpty } = buildSavedSearchDraft(f, {});
    expect(isEmpty).toBe(false);
    expect(query).toEqual({
      attrGroups: JSON.stringify({ series: ['gt', 'sx'] }),
      color: 'black,red',
      maxPrice: 500,
      search: 'bmw',
      sortBy: 'created_desc',
      tradeOnly: true,
    });
    expect(query).not.toHaveProperty('page');
    expect(query).not.toHaveProperty('limit');
    // The list request for the same filters is a superset (it adds paging only).
    const listParams = buildListParams(f, 1, PAGE_SIZE);
    expect(listParams).toMatchObject({ search: 'bmw', maxPrice: 500, tradeOnly: true, page: 1, limit: PAGE_SIZE });
  });

  it('labels come from the names the filters carry, then from the option lists (id-only deep link)', () => {
    const names = {
      categories: [{ id: 'c1', name: 'Diecast', slug: 'diecast' }],
      brands: [{ id: 'b1', name: 'BMW', slug: 'bmw' }],
      manufacturers: [{ id: 'm1', name: 'Hot Wheels', slug: 'hot-wheels' }],
      carModels: [{ id: 'cm1', name: 'M3', slug: 'm3', brandId: 'b1' }],
    };
    const carried = buildSavedSearchDraft(
      filters({ categoryId: 'c1', category: 'Arabalar', brandId: 'b1', brand: 'BMW Group' }),
      names,
    );
    expect(carried.labels).toEqual({ brandId: 'BMW Group', categoryId: 'Arabalar' });

    const idOnly = buildSavedSearchDraft(
      filters({ categoryId: 'c1', brandId: 'b1', manufacturerId: 'm1', carModelId: 'cm1' }),
      names,
    );
    expect(idOnly.labels).toEqual({
      brandId: 'BMW',
      carModelId: 'M3',
      categoryId: 'Diecast',
      manufacturerId: 'Hot Wheels',
    });
    // The default name reads the labels in the contract's order (search, category, brand, ... ).
    expect(buildSavedSearchDraft(filters({ search: 'e30', categoryId: 'c1', brandId: 'b1' }), names).defaultName).toBe(
      'e30 · Diecast · BMW',
    );
  });

  it('an id with no known name gets no label (never a generic one)', () => {
    expect(buildSavedSearchDraft(filters({ categoryId: 'c-unknown' }), {}).labels).toEqual({});
  });

  it('a name-only brand is saved as `brand`, with no label needed', () => {
    const draft = buildSavedSearchDraft(filters({ brand: 'Ferrari' }), {});
    expect(draft.query).toEqual({ brand: 'Ferrari' });
    expect(draft.defaultName).toBe('Ferrari');
  });

  it('a name over the limit is cut by the contract, and a blank name is not sent', () => {
    expect(buildSavedSearchDraft(filters({ search: 'x'.repeat(100) }), {}).defaultName).toHaveLength(60);
    const draft = buildSavedSearchDraft(filters({ search: 'bmw' }), {});
    expect(toCreateSavedSearchInput(draft, '  ')).toEqual({ query: { search: 'bmw' }, labels: {} });
    expect(toCreateSavedSearchInput(draft, ' My BMW ')).toEqual({
      name: 'My BMW',
      query: { search: 'bmw' },
      labels: {},
    });
  });
});

describe('save then run round trip', () => {
  it('the saved query, run through savedSearchToRouteParams, reopens the same list request', () => {
    const original = filters({
      search: 'bmw',
      categoryId: 'c1',
      category: 'Diecast',
      brandId: 'b1',
      brand: 'BMW',
      manufacturerId: 'm1',
      manufacturer: 'Hot Wheels',
      carModelId: 'cm1',
      carModel: 'M3',
      scale: '1:18',
      material: 'metal',
      colors: ['black', 'red'],
      condition: 'new',
      minPrice: '100',
      maxPrice: '900',
      tradeOnly: true,
      discountOnly: true,
      preOrder: true,
      limited: true,
      set: true,
      customAttributes: { series: ['gt', 'sx'], rarity: ['rare'] },
      sortBy: 'price_desc',
    });
    const { query, labels } = buildSavedSearchDraft(original, {});

    const reopened = filtersFromSearchParams(savedSearchToRouteParams(query, labels));

    // Compared in canonical form: the JSON key order of `attrGroups` is the only thing that may differ.
    const request = (f: ProductFilters) => canonicalizeSavedSearchQuery(buildListParams(f, 1, PAGE_SIZE));
    expect(request(reopened)).toEqual(request(original));
    expect(request(reopened)).toEqual(query);
    // The display names come back for the chips.
    expect(reopened).toMatchObject({ category: 'Diecast', brand: 'BMW', manufacturer: 'Hot Wheels', carModel: 'M3' });
  });
});
