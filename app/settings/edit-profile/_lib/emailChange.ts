/** E-posta değişikliği satır içi akışının aşamaları. */
export type EmailPhase = 'idle' | 'entering' | 'codeSent';

/** Sunucu, kullanıcı başına 60 sn'de bir kod isteğine izin verir (`emailChangeTooFrequent`). */
export const EMAIL_CODE_RESEND_SECONDS = 60;
