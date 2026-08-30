import { z } from 'zod';
import type { TFunction } from 'i18next';
import { usernameSchema } from '@/utils/validation';

// Kural tek kaynaktan gelir: `@/utils/validation` (§5). Bu dosya yalnız formun
// alan şeklini (`{ username }`) tanımlar. Fabrika biçiminin gerekçesi
// `@/utils/validation` başında.
export const buildClaimUsernameSchema = (t: TFunction) =>
  z.object({ username: usernameSchema(t) });

export type UsernameInput = z.input<ReturnType<typeof buildClaimUsernameSchema>>;
