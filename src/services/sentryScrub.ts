/**
 * Sentry olaylarından kişisel veri temizliği — kurallar `@/lib/logger/scrub`'ta TEK yerde
 * (release konsol günlüğüyle ortak). Burası geriye dönük uyumlu yeniden dışa aktarımdır.
 */
export { scrubEvent } from '@/lib/logger/scrub';
