import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timingRulesApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { PublicTimingPolicy } from '@/lib/api/timingRules';
import {
  FALLBACK_TIMING_POLICY,
  parseTimingPolicy,
  timingMessageValues,
  type TimingMessageValues,
} from '@/lib/shared/timingPolicy';

const POLICY_STALE_MS = 5 * 60_000;

/**
 * Politika süreleri (iade penceresi, ödeme süresi, hazırlık süresi…) —
 * uygulamadaki TEK istemci okuması (web `useTimingPolicy` aynası). Aynı sorgu
 * anahtarı tüm bileşenleri tek isteğe bağlar. Yüklenene ya da istek başarısız
 * olana kadar kayıt varsayılanları döner.
 *
 * Hata YUTULMAZ (web gibi `retry: 1`): başarısız istek önbelleğe geri düşüşü
 * "başarılı veri" diye yazmaz, `data` `undefined` kalır. Böylece 5 dakikalık
 * `staleTime` boyunca varsayılanlar sunucu değeri sanılmaz; bir sonraki
 * odak/yeniden bağlanma/ekran açılışında istek yeniden denenir. Varsayılanlar
 * yalnız bu dönüşte, GÖSTERİM için kullanılır.
 */
export function useTimingPolicy(): PublicTimingPolicy {
  const { data } = useQuery({
    queryKey: qk.timingPolicy.all,
    queryFn: async () => parseTimingPolicy((await timingRulesApi.getPolicy()).data),
    staleTime: POLICY_STALE_MS,
    retry: 1,
  });
  return data ?? FALLBACK_TIMING_POLICY;
}

/** ICU parametreleri: `t('order.refundWindowPassed', values)`. */
export function useTimingValues(): TimingMessageValues {
  const policy = useTimingPolicy();
  return useMemo(() => timingMessageValues(policy), [policy]);
}
