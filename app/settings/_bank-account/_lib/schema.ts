import { z } from 'zod';
import type { TFunction } from 'i18next';
import { isValidTrIban } from '@/utils/iban';

/**
 * Fabrika biçimi: zod mesajları şema kurulurken çözülüyor, modül seviyesinde
 * kurulsa metin ilk yüklenen dilde donardı (bkz. `@/utils/validation` başı).
 *
 * TCKN alanı YOK (delta 23 §3, B-1.8): TCKN'nin tek kaynağı üyenin yasal
 * kimliği (gerekirse kayıttan önce kimlik adımında istenir — B-2.4). API
 * `tcKimlikNo`'yu yalnız eski istemciler için kabul ediyor ve gönderilmezse
 * kayıtlı değere DOKUNMUYOR (user-bank.service `resolveBankTckn`).
 */
export const buildBankAccountSchema = (t: TFunction) =>
  z.object({
    accountHolder: z.string().min(2, t('bankAccount.holderMinLength')).max(150),
    iban: z.string().refine((v) => isValidTrIban(v), t('bankAccount.ibanInvalid')),
    taxId: z.string().max(20).optional().or(z.literal('')),
  });

export type BankAccountForm = z.input<ReturnType<typeof buildBankAccountSchema>>;

export const EMPTY_BANK_ACCOUNT: BankAccountForm = { accountHolder: '', iban: '', taxId: '' };
