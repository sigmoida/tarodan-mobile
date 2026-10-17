import { normalizeIban } from '@/utils/iban';
import type { BankAccountForm } from './schema';

/** Form → `PATCH /users/me/bank-account` gövdesi (tek kaynak). */
export function toBankAccountPayload(data: BankAccountForm) {
  return {
    accountHolder: data.accountHolder.trim(),
    iban: normalizeIban(data.iban),
    ...(data.taxId ? { taxId: data.taxId } : {}),
  };
}

/** İki form aynı gövdeyi mi üretir? (IBAN boşlukları, ad kenar boşluğu fark etmez.) */
export function sameBankAccountPayload(a: BankAccountForm, b: BankAccountForm): boolean {
  const pa = toBankAccountPayload(a);
  const pb = toBankAccountPayload(b);
  return pa.accountHolder === pb.accountHolder && pa.iban === pb.iban && pa.taxId === pb.taxId;
}
