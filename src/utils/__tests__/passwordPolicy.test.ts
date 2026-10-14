/**
 * J41 · şifre kuralı — tek kaynak (`../passwordPolicy`), sunucu ile birebir: 8-72 karakter,
 * ≥1 büyük \p{Lu}, ≥1 küçük \p{Ll}, ≥1 rakam; özel karakter şartı yok. Mesajlar gerçek
 * katalogla (`schemaT`): kural metni yanlış anahtara bağlanırsa test düşer.
 */
import { z } from 'zod';
import { schemaT } from '@/test-utils';
import {
  firstPasswordViolation,
  missingPasswordRules,
  passwordChecks,
  passwordHint,
  passwordSchema,
  refinePasswordMatch,
} from '../passwordPolicy';

describe('passwordPolicy (sunucu ile birebir)', () => {
  it.each(['Şifre123!', 'ĞÜŞİÖÇ12ab', 'Demo1234', 'Yeni12345'])('geçerli: %s', (pw) => {
    expect(firstPasswordViolation(pw)).toBeNull();
  });

  it('72 sınırı dahil, 73 reddedilir', () => {
    expect(firstPasswordViolation(`Aa1${'x'.repeat(69)}`)).toBeNull();
    expect(firstPasswordViolation(`Aa1${'x'.repeat(70)}`)).toBe('max');
  });

  it('ihlaller', () => {
    expect(firstPasswordViolation('Ab1')).toBe('min');
    expect(firstPasswordViolation('demo1234')).toBe('uppercase');
    expect(firstPasswordViolation('DEMO1234')).toBe('lowercase');
    expect(firstPasswordViolation('Demoabcd')).toBe('number');
  });

  it('Türkçe harfler büyük/küçük sayılır', () => {
    expect(passwordChecks('şİ123456')).toMatchObject({ hasUppercase: true, hasLowercase: true });
    expect(missingPasswordRules('şifre1234').map((r) => r.id)).toEqual(['uppercase']);
  });
});

const schema = passwordSchema(schemaT);
const issues = (value: string) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('J41 · passwordSchema (zod)', () => {
  it('boş → "Şifre gerekli"', () => {
    expect(issues('')).toEqual(['Şifre gerekli']);
  });

  it('eksik kuralların hepsi TEK mesajda, her biri ayrı satırda', () => {
    expect(issues('ab')).toEqual([
      ['En az 8 karakter olmalı', 'En az 1 büyük harf ekleyin', 'En az 1 rakam ekleyin'].join('\n'),
    ]);
  });

  it('tek eksik → yalnız o kural', () => {
    expect(issues('Demoabcd')).toEqual(['En az 1 rakam ekleyin']);
    expect(issues('Ab1')).toEqual(['En az 8 karakter olmalı']);
    expect(issues('demo1234')).toEqual(['En az 1 büyük harf ekleyin']);
    expect(issues('DEMO1234')).toEqual(['En az 1 küçük harf ekleyin']);
  });

  it('72 üstü → üst sınır mesajı', () => {
    expect(issues(`Aa1${'x'.repeat(70)}`)).toEqual(['En fazla 72 karakter olabilir']);
  });

  it('özel karakter ŞART DEĞİL, ama serbest (her karakter kabul)', () => {
    expect(schema.safeParse('Demo1234').success).toBe(true);
    expect(schema.safeParse('Demo1234#_ ~ğü').success).toBe(true);
    expect(schema.safeParse('Şifre123!').success).toBe(true);
  });
});

describe('passwordHint (alanın altındaki anlık ipucu)', () => {
  it('boş alan → ipucu yok', () => {
    expect(passwordHint('', schemaT)).toBeUndefined();
    expect(passwordHint(undefined, schemaT)).toBeUndefined();
  });

  it('yazarken yalnız eksik kurallar; hepsi tamamsa mesaj yok', () => {
    expect(passwordHint('Demoabcd', schemaT)).toBe('En az 1 rakam ekleyin');
    expect(passwordHint('Demo1234', schemaT)).toBeUndefined();
  });
});

describe('refinePasswordMatch', () => {
  const pair = z
    .object({ password: z.string(), confirm: z.string() })
    .superRefine(refinePasswordMatch(schemaT, 'password', 'confirm'));

  it('eşleşmeyen tekrar → tekrar alanında "Şifreler eşleşmiyor"', () => {
    const r = pair.safeParse({ password: 'Demo1234', confirm: 'Demo12345' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues).toEqual([
        expect.objectContaining({ path: ['confirm'], message: 'Şifreler eşleşmiyor' }),
      ]);
    }
  });

  it('eşleşen tekrar geçer', () => {
    expect(pair.safeParse({ password: 'Demo1234', confirm: 'Demo1234' }).success).toBe(true);
  });
});
