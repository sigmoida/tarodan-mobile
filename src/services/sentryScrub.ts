/**
 * Sentry olaylarından kişisel veri ve sır temizliği — kurallar `@/lib/logger/scrub`'ta TEK yerde
 * (release konsol günlüğüyle ortak). Burası geriye dönük uyumlu yeniden dışa aktarımdır.
 */
export { scrubBreadcrumb, scrubEvent, sentryUser } from '@/lib/logger/scrub';
