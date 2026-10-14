import { theme } from '@/ui';

const { spacing } = theme;

/**
 * Ana sayfa bölüm aralığı — TEK kaynak. Hero, üretici şeridi ve bölüm kartları aynı sol/sağ
 * kenarda (`HOME_GUTTER`, web PageShell `px-4`) ve aralarında aynı dikey boşlukla
 * (`HOME_SECTION_GAP`, web `space-y-4`) durur. Hero üst bardan da bu kadar ayrılır (barla
 * birleşik görünmesin).
 */
export const HOME_GUTTER = spacing[4];
export const HOME_SECTION_GAP = spacing[4];
