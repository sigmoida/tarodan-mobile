import { z } from 'zod';
import type { TFunction } from 'i18next';

/**
 * Fabrika biçimi: zod mesajları şema kurulurken çözülüyor, modül seviyesinde
 * kurulsa metin ilk yüklenen dilde donardı (bkz. `@/utils/validation` başı).
 */

/** IBAN: TR + 24 rakam (backend `^TR\d{24}$`). Girişte büyük harfe çevrilir. */
export const buildApplicationDetailsSchema = (t: TFunction) =>
  z.object({
    companyType: z.string().trim().optional().or(z.literal('')),
    taxId: z
      .string()
      .trim()
      .regex(/^\d{10}$/, t('businessApplication.taxIdInvalid'))
      .optional()
      .or(z.literal('')),
    taxOffice: z
      .string()
      .trim()
      .max(100, t('validation.maxLength', { max: 100 }))
      .optional()
      .or(z.literal('')),
    companyCity: z.string().trim().optional().or(z.literal('')),
    companyDistrict: z.string().trim().optional().or(z.literal('')),
    bankAccountHolder: z
      .string()
      .trim()
      .min(2, t('validation.minLength', { min: 2 }))
      .optional()
      .or(z.literal('')),
    iban: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, '').toUpperCase())
      .refine((v) => v === '' || /^TR\d{24}$/.test(v), t('bankAccount.ibanInvalid'))
      .optional(),
  });

export type ApplicationDetailsForm = z.infer<ReturnType<typeof buildApplicationDetailsSchema>>;

export const buildStakeholderSchema = (t: TFunction) =>
  z
    .object({
      fullName: z.string().trim().min(2, t('validation.minLength', { min: 2 })),
      identityType: z.enum(['tckn', 'passport']),
      identityNumber: z.string().trim().optional().or(z.literal('')),
    })
    .refine((v) => v.identityType !== 'tckn' || /^\d{11}$/.test(v.identityNumber ?? ''), {
      path: ['identityNumber'],
      message: t('bankAccount.tcknInvalid'),
    });

export type StakeholderForm = z.infer<ReturnType<typeof buildStakeholderSchema>>;

export const buildAppealSchema = (t: TFunction) =>
  z.object({
    note: z
      .string()
      .trim()
      .min(10, t('validation.minLength', { min: 10 }))
      .max(1000, t('validation.maxLength', { max: 1000 })),
  });

export type AppealForm = z.infer<ReturnType<typeof buildAppealSchema>>;
