/** E-posta değişikliği ekranının adımları: yeni adres → 6 haneli kod. */
export type EmailPhase = 'entering' | 'codeSent';

/** Sunucu, kullanıcı başına 60 sn'de bir kod isteğine izin verir (`emailChangeTooFrequent`). */
export const EMAIL_CODE_RESEND_SECONDS = 60;
