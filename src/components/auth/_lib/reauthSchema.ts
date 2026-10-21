import type { TFunction } from 'i18next';
import { z } from 'zod';

/**
 * Password proof of the confirm step. Only "not empty": the API checks it as typed (no trim),
 * and a policy check here would lock out an older password that predates the policy.
 */
export const reauthPasswordSchema = (t: TFunction) =>
  z.object({ password: z.string().min(1, t('validation.passwordRequired')) });

export type ReauthPasswordValues = z.input<ReturnType<typeof reauthPasswordSchema>>;
