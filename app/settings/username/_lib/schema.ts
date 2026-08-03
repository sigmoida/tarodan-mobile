import { z } from 'zod';
import { usernameSchema } from '@/utils/validation';

// Kural tek kaynaktan gelir: `@/utils/validation` (§5). Bu dosya yalnız formun
// alan şeklini (`{ username }`) tanımlar.
export const claimUsernameSchema = z.object({ username: usernameSchema });

export type UsernameInput = z.input<typeof claimUsernameSchema>;
