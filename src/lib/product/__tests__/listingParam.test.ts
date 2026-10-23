import { listingIdFromParam } from '../listingParam';

const ID = '0b1e5c1a-7d2f-4e3a-9c4b-5d6e7f8a9b0c';

describe('listingIdFromParam', () => {
  it.each([
    ['a bare uuid', ID],
    ['a slug-uuid segment', `ferrari-f40-${ID}`],
    ['an upper-case uuid', ID.toUpperCase()],
    ['a stale slug', `old-title-${ID}`],
    ['a percent-encoded Turkish slug', `k%C4%B1rm%C4%B1z-${ID}`],
    ['an expo-router array param (first value)', [`ferrari-${ID}`, 'x']],
  ])('%s -> the lower-case uuid', (_label, param) => {
    expect(listingIdFromParam(param)).toBe(ID);
  });

  it.each([
    ['garbage', 'garbage'],
    ['a numeric id', '42'],
    ['an empty string', ''],
    ['a truncated uuid', ID.slice(1)],
    ['a malformed percent escape', '%E0%A4%A'],
    ['undefined', undefined],
    ['null', null],
    ['an empty array', []],
  ])('%s -> null', (_label, param) => {
    expect(listingIdFromParam(param as string | null | undefined)).toBeNull();
  });
});
