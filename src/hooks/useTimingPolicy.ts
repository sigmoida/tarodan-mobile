import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timingRulesApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { PublicTimingPolicy } from '@/lib/api/timingRules';
import {
  FALLBACK_TIMING_POLICY,
  loadTimingPolicy,
  timingMessageValues,
  type TimingMessageValues,
} from '@/lib/shared/timingPolicy';

const POLICY_STALE_MS = 5 * 60_000;

/**
 * Politika süreleri (iade penceresi, ödeme süresi, hazırlık süresi…) —
 * uygulamadaki TEK istemci okuması (web `useTimingPolicy` aynası). Aynı sorgu
 * anahtarı tüm bileşenleri tek isteğe bağlar. Yüklenene ya da istek başarısız
 * olana kadar kayıt varsayılanları döner.
 */
export function useTimingPolicy(): PublicTimingPolicy {
  const { data } = useQuery({
    queryKey: qk.timingPolicy.all,
    queryFn: () => loadTimingPolicy(async () => (await timingRulesApi.getPolicy()).data),
    staleTime: POLICY_STALE_MS,
  });
  return data ?? FALLBACK_TIMING_POLICY;
}

/** ICU parametreleri: `t('order.refundWindowPassed', values)`. */
export function useTimingValues(): TimingMessageValues {
  const policy = useTimingPolicy();
  return useMemo(() => timingMessageValues(policy), [policy]);
}
