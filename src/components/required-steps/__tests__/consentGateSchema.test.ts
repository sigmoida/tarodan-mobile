/** B2 inceleme 10 · Onay kapısı formu: tüm bekleyen belgeler işaretli olmalı (şemada). */
import type { PendingConsent } from '@/lib/shared/legalConsent';
import { consentGateSchema } from '../consentGateSchema';

const p = (document: PendingConsent['document']): PendingConsent => ({
  document,
  version: '2026-08-04',
  reason: 'missing',
  path: null,
});

describe('consentGateSchema', () => {
  const schema = consentGateSchema([p('terms'), p('privacy'), p('kvkk')]);

  it('bekleyenlerin hepsi işaretliyse geçer', () => {
    expect(schema.safeParse({ accepted: ['kvkk@2026-08-04', 'terms@2026-08-04', 'privacy@2026-08-04'] }).success).toBe(true);
  });

  it('eksik belge varsa accepted alanında hata verir', () => {
    const r = schema.safeParse({ accepted: ['terms@2026-08-04', 'privacy@2026-08-04'] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['accepted']);
  });

  it('eski sürümün işareti yeni sürümü karşılamaz', () => {
    const v2 = consentGateSchema([{ ...p('terms'), version: '2026-09-01' }]);
    expect(v2.safeParse({ accepted: ['terms@2026-08-04'] }).success).toBe(false);
    expect(v2.safeParse({ accepted: ['terms@2026-09-01'] }).success).toBe(true);
  });

  it('bekleyen yoksa gönderilecek bir şey yok', () => {
    expect(consentGateSchema([]).safeParse({ accepted: [] }).success).toBe(false);
  });
});
