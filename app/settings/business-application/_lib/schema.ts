import { z } from 'zod';

/** IBAN: TR + 24 rakam (backend `^TR\d{24}$`). Girişte büyük harfe çevrilir. */
export const applicationDetailsSchema = z.object({
  companyType: z.string().trim().optional().or(z.literal('')),
  taxId: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Vergi numarası 10 hane olmalı')
    .optional()
    .or(z.literal('')),
  taxOffice: z.string().trim().max(100, 'En fazla 100 karakter').optional().or(z.literal('')),
  companyCity: z.string().trim().optional().or(z.literal('')),
  companyDistrict: z.string().trim().optional().or(z.literal('')),
  bankAccountHolder: z
    .string()
    .trim()
    .min(2, 'En az 2 karakter')
    .optional()
    .or(z.literal('')),
  iban: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, '').toUpperCase())
    .refine((v) => v === '' || /^TR\d{24}$/.test(v), 'IBAN TR ile başlayıp 24 rakam içermeli')
    .optional(),
});

export type ApplicationDetailsForm = z.infer<typeof applicationDetailsSchema>;

export const stakeholderSchema = z
  .object({
    fullName: z.string().trim().min(2, 'En az 2 karakter'),
    identityType: z.enum(['tckn', 'passport']),
    identityNumber: z.string().trim().optional().or(z.literal('')),
  })
  .refine((v) => v.identityType !== 'tckn' || /^\d{11}$/.test(v.identityNumber ?? ''), {
    path: ['identityNumber'],
    message: 'TC Kimlik No 11 hane olmalı',
  });

export type StakeholderForm = z.infer<typeof stakeholderSchema>;

export const appealSchema = z.object({
  note: z.string().trim().min(10, 'En az 10 karakter yazın').max(1000, 'En fazla 1000 karakter'),
});

export type AppealForm = z.infer<typeof appealSchema>;
