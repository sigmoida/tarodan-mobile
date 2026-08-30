/**
 * Zarf toleransı (bulgu M4). Quote çağrıları `res.data`'yı düz kabul ediyordu;
 * uç `{data:{...}}` sarmalına geçseydi `pricing.summary` sessizce `undefined`
 * olur, hiçbir tutar basılamaz ve checkout kilitlenirdi.
 */
import { unwrapEnvelope, readList } from '../apiEnvelope';

type Body = { pricing?: { summary?: { total: number } }; pricingHash?: string };

const BODY: Body = { pricingHash: 'h1', pricing: { summary: { total: 165 } } };

describe('unwrapEnvelope', () => {
  it('düz gövdeyi olduğu gibi döndürür', () => {
    expect(unwrapEnvelope<Body>({ data: BODY })).toEqual(BODY);
  });

  it('{data:{...}} zarfını açar', () => {
    expect(unwrapEnvelope<Body>({ data: { data: BODY } })).toEqual(BODY);
  });

  it('yanıt/gövde yokken boş nesne döndürür (çağıran optional-chain ile okur)', () => {
    expect(unwrapEnvelope<Body>(undefined)).toEqual({});
    expect(unwrapEnvelope<Body>(null)).toEqual({});
    expect(unwrapEnvelope<Body>({})).toEqual({});
  });
});

describe('readList', () => {
  it('accepts a bare array', () => {
    expect(readList({ data: [1, 2] })).toEqual([1, 2]);
  });

  it('accepts the { data: [...] } envelope', () => {
    expect(readList({ data: { data: [1] } })).toEqual([1]);
  });

  it('accepts a paginated { items: [...] } body', () => {
    expect(readList({ data: { items: [1], total: 1 } })).toEqual([1]);
  });

  it('returns an empty array for anything else rather than letting map throw', () => {
    expect(readList({ data: { data: 'nope' } })).toEqual([]);
    expect(readList({ data: null })).toEqual([]);
    expect(readList(null)).toEqual([]);
    expect(readList(undefined)).toEqual([]);
  });
});
