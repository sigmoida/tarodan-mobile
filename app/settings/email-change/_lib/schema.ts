import { z } from 'zod';
import type { TFunction } from 'i18next';

/** Zod mesajları şema KURULURKEN çözülür — bkz. `@/utils/validation` başı. */
export const buildEmailChangeSchema = (t: TFunction) =>
  z.object({
    newEmail: z
      .string()
      .trim()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.invalidEmail')),
  });

export const buildEmailCodeSchema = (t: TFunction) =>
  z.object({
    code: z.string().trim().regex(/^\d{6}$/, t('validation.sixDigitCode')),
  });

export type EmailChangeInput = z.input<ReturnType<typeof buildEmailChangeSchema>>;
export type EmailCodeInput = z.input<ReturnType<typeof buildEmailCodeSchema>>;
