import { unwrapList } from '../unwrap';

describe('unwrapList', () => {
  it('zarfsız diziyi olduğu gibi döndürür', () => {
    expect(unwrapList<number>([1, 2])).toEqual([1, 2]);
  });
  it('{ data: [...] } zarfını açar', () => {
    expect(unwrapList<number>({ data: [1, 2] })).toEqual([1, 2]);
  });
  it('dizi olmayan her şey için []', () => {
    expect(unwrapList(null)).toEqual([]);
    expect(unwrapList(undefined)).toEqual([]);
    expect(unwrapList({})).toEqual([]);
    expect(unwrapList({ data: { items: [] } })).toEqual([]);
    expect(unwrapList('x')).toEqual([]);
  });
});
