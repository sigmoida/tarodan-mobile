import { z } from 'zod';

export const emailChangeSchema = z.object({
  newEmail: z.string().trim().min(1, 'E-posta gerekli').email('Geçerli bir e-posta girin'),
});

export const emailCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, '6 haneli kodu girin'),
});

export type EmailChangeInput = z.input<typeof emailChangeSchema>;
export type EmailCodeInput = z.input<typeof emailCodeSchema>;
