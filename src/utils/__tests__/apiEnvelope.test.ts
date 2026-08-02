/**
 * Zarf toleransı (bulgu M4). Quote çağrıları `res.data`'yı düz kabul ediyordu;
 * uç `{data:{...}}` sarmalına geçseydi `pricing.summary` sessizce `undefined`
 * olur, hiçbir tutar basılamaz ve checkout kilitlenirdi.
 */
import { unwrapEnvelope } from '../apiEnvelope';

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
