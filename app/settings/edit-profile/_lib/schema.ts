import { z } from 'zod';

import { getPhoneInvalidMessage } from '@/utils/phone';

export const MAX_BIO_LENGTH = 500; // Backend DTO (UpdateProfileDto) bio'yu 500 ile sınırlar — web ile aynı.

// 18+ kontrolü (web ile parite): doğum tarihi en geç bugünden 18 yıl önce olmalı.
export const minBirthDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

export const createProfileSchema = (isBusinessTier: boolean) =>
  z.object({
    displayName: z.string().min(2, 'İsim en az 2 karakter olmalı').max(50),
    bio: z
      .string()
      .max(MAX_BIO_LENGTH, `Biyografi en fazla ${MAX_BIO_LENGTH} karakter olabilir`)
      .optional()
      .or(z.literal('')),
    // Sınır Türkçe mesaja bağlı: formatlayıcı fazla haneyi KIRPMAYI bıraktığı için
    // (bkz. `@/utils/phone`) ham metin artık alanda kalabiliyor ve bu `max` gerçekten
    // ulaşılabilir hâle geldi. Çıplak `max(20)` zod'un İngilizce iç mesajını
    // ("String must contain at most 20 character(s)") kullanıcıya gösteriyordu —
    // üstelik zod resolver'ı `onSubmit`'teki Türkçe kapıdan önce koştuğu için o kapı
    // hiç çalışmıyordu.
    //
    // Sınır hiçbir geçerli girdiyi reddedemez: alan ülke kodunu ayrı bir `Select`'te
    // tuttuğu için formatlanmış TR değeri 13 karakter (`532 123 45 67`), TR dışında
    // yalnız rakam. Yani `max` burada bir emniyet kemeri; asıl reddi `parseE164TrPhone`
    // ve `onSubmit` kapısı veriyor.
    phone: z.string().max(20, getPhoneInvalidMessage()).optional().or(z.literal('')),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Lütfen geçerli bir doğum tarihi seçin')
      .refine((val) => new Date(val) <= minBirthDate(), '18 yaşından büyük olmalısınız')
      .optional()
      .or(z.literal('')),
    // Kurumsal (business tier) — web ile parite. Business ise firma adı zorunlu.
    companyName: isBusinessTier
      ? z.string().min(2, 'Şirket adı zorunludur').max(120)
      : z.string().max(120).optional().or(z.literal('')),
    taxId: z.string().max(20).optional().or(z.literal('')),
    taxOffice: z.string().max(120).optional().or(z.literal('')),
  });

export type ProfileForm = {
  displayName: string;
  bio?: string;
  phone?: string;
  birthDate?: string;
  companyName?: string;
  taxId?: string;
  taxOffice?: string;
};
