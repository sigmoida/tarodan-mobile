import { z } from 'zod';
import {
  LEGAL_IDENTITY_FIELDS,
  isValidLegalName,
  isValidTckn,
  normalizeLegalName,
  normalizeTckn,
  type LegalIdentityField,
  type LegalIdentityStatus,
  type SubmitLegalIdentityRequest,
} from '@/lib/shared/legalIdentity';

/**
 * Kimlik formunun ortak parçaları — web `apps/web/src/lib/legalIdentity.ts`
 * ile aynı. Kural `@/lib/shared/legalIdentity`'de (vendored `@tarodan/types`);
 * zod sarmalayıcıları web'de `@tarodan/ui/form`'da duruyor, mobilin vendored
 * form katmanında olmadığı için burada aynı tanımla duruyor.
 */

export interface LegalIdentityMessages {
  nameInvalid: string;
  nationalIdInvalid: string;
}

/** Zorunlu yasal ad/soyad (harf, Türkçe dahil, 2–50 karakter). */
const legalName = (message: string) => z.string().refine((v) => isValidLegalName(v), message);

/** Zorunlu TCKN; boşluk/tire tolere edilir, checksum edilmez. */
const tckn = (message: string) => z.string().refine((v) => isValidTckn(v), message);

/**
 * Kimlik kapısının şeması: yalnız EKSİK alanlar zorunludur; dolu alanlar
 * formda salt-okunur durur ve gönderilmez.
 */
export const legalIdentityGateSchema = (
  missing: readonly LegalIdentityField[],
  messages: LegalIdentityMessages,
) => {
  const rules = {
    legalFirstName: legalName(messages.nameInvalid),
    legalLastName: legalName(messages.nameInvalid),
    nationalId: tckn(messages.nationalIdInvalid),
  };
  const pick = (field: LegalIdentityField) => (missing.includes(field) ? rules[field] : z.string());
  return z.object({
    legalFirstName: pick('legalFirstName'),
    legalLastName: pick('legalLastName'),
    nationalId: pick('nationalId'),
  });
};
export type LegalIdentityFormValues = Record<LegalIdentityField, string>;

/**
 * Sunucuya giden gövde: yalnız eksik alanlar, normalize edilmiş hâlde (TCKN
 * yalnız rakam, ad boşlukları teklenmiş). Dolu bir alanı göndermek sunucuda
 * "değiştirme girişimi" sayılırdı (409 `server.identity.locked`).
 */
export function legalIdentitySubmission(
  values: LegalIdentityFormValues,
  missing: readonly LegalIdentityField[],
): SubmitLegalIdentityRequest {
  const body: SubmitLegalIdentityRequest = {};
  for (const field of LEGAL_IDENTITY_FIELDS) {
    if (!missing.includes(field)) continue;
    body[field] =
      field === 'nationalId' ? normalizeTckn(values[field]) : normalizeLegalName(values[field]);
  }
  return body;
}

/**
 * Üyeden bir şey istenecek mi? Muaf hesapta (`required:false`: personel, test
 * şeridi) ya da eksik alan yoksa HAYIR — kapı hiç gösterilmez.
 */
export function needsLegalIdentity(status: LegalIdentityStatus | null | undefined): boolean {
  return !!status && status.required && status.missing.length > 0;
}
