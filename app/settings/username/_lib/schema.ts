import { z } from 'zod';

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;

export const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'En az 3 karakter')
    .max(30, 'En fazla 30 karakter')
    .regex(USERNAME_PATTERN, 'Yalnız küçük harf, rakam, nokta ve alt çizgi; başta/sonda nokta olamaz'),
});

export type UsernameInput = z.input<typeof usernameSchema>;
