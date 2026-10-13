/** B-2.4 · Kimlik formu: şema yalnız eksikleri zorunlu tutar, gövde yalnız eksikleri taşır. */
import {
  legalIdentityGateSchema,
  legalIdentitySubmission,
  needsLegalIdentity,
} from '../legalIdentity';

const messages = { nameInvalid: 'name', nationalIdInvalid: 'tckn' };

describe('legalIdentity form', () => {
  it('şema: dolu (eksik olmayan) alan boş geçer, eksik alan kurala tabi', () => {
    const schema = legalIdentityGateSchema(['nationalId'], messages);
    expect(schema.safeParse({ legalFirstName: '', legalLastName: '', nationalId: '10000000146' }).success).toBe(true);
    const bad = schema.safeParse({ legalFirstName: '', legalLastName: '', nationalId: '1' });
    expect(bad.success).toBe(false);
  });

  it('gövde: yalnız eksik alanlar, normalize edilmiş (payload)', () => {
    expect(
      legalIdentitySubmission(
        { legalFirstName: 'Ayşe', legalLastName: '  Öz  Demir ', nationalId: '100 000 001 46' },
        ['legalLastName', 'nationalId'],
      ),
    ).toEqual({ legalLastName: 'Öz Demir', nationalId: '10000000146' });
  });

  it('muaf hesap ya da eksiksiz kimlik istenmez', () => {
    const base = { legalFirstName: null, legalLastName: null, nationalIdMasked: null, suggestedNationalId: null };
    expect(needsLegalIdentity({ ...base, required: true, missing: ['nationalId'] })).toBe(true);
    expect(needsLegalIdentity({ ...base, required: false, missing: [] })).toBe(false);
    expect(needsLegalIdentity({ ...base, required: true, missing: [] })).toBe(false);
    expect(needsLegalIdentity(null)).toBe(false);
  });
});
