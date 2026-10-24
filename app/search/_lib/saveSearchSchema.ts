import { z } from 'zod';
import type { TFunction } from 'i18next';
import { SAVED_SEARCH_NAME_MAX } from '@/types';

/**
 * The name field of the "Save this search" modal (optional; the API derives one when blank). The
 * limit counts code points, the unit the API uses. Factory form: the message resolves at call time
 * (`src/i18n/CLAUDE.md`).
 */
export const buildSaveSearchSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .trim()
      .refine((v) => Array.from(v).length <= SAVED_SEARCH_NAME_MAX, {
        message: t('validation.maxLength', { max: SAVED_SEARCH_NAME_MAX }),
      }),
  });
export type SaveSearchForm = z.infer<ReturnType<typeof buildSaveSearchSchema>>;
