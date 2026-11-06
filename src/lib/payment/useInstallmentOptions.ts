import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api';
import { isServerOrNetworkFailure } from '@/lib/api/reauthError';
import { qk } from '@/lib/query';
import { captureException } from '@/services/sentry';
import type { InstallmentOptionsRequest } from '@/types/installments';
import {
  INSTALLMENT_OPTIONS_DEBOUNCE_MS,
  installmentOfferOf,
  installmentSourceKey,
  type InstallmentCardSource,
  type InstallmentOffer,
} from './installments';

/** Selector state: nothing to price yet, waiting for the answer, or the answer read. */
export type InstallmentOptionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; offer: InstallmentOffer };

/**
 * Installment options for the pay screen (`POST /payments/installment-options`, ADR 0019).
 *
 * A pure read, so it is a query hook (not one of the payment exceptions in
 * `src/lib/query/CLAUDE.md`): the money moves only at `direct-form`, which re-prices the count
 * and refuses a drifted total with a 409.
 *
 * - The card source is debounced (300 ms); while the typed BIN differs from the debounced one the
 *   state is `loading`, so options priced for another card are never shown.
 * - A changed source is a new key: the query of the old card loses its observer and React Query
 *   aborts its request (the `signal` is passed to axios), so a late answer cannot land.
 * - A refetch (after a 409) reads as `loading` again, so the old total is not payable meanwhile.
 * - Every failure (network, 5xx, 429, 4xx) falls back to the single payment (`unavailable`);
 *   no retry, no refetch on focus or reconnect (the prices must not change under the buyer's
 *   choice; a drift is caught by the 409 and `refetch`).
 * - Sentry gets only network / 5xx failures, tagged with the payment id. Never the BIN: it is
 *   not passed to the report, and request bodies are dropped by the scrubber.
 * - The BIN lives only in the in-memory key (`qk.payments.installmentOptions` is not persisted),
 *   dropped a minute after the screen closes.
 */
export function useInstallmentOptions(input: {
  paymentId: string | undefined;
  isGuest: boolean;
  source: InstallmentCardSource | null;
  enabled: boolean;
}) {
  const { paymentId, isGuest, source, enabled } = input;
  const sourceKey = installmentSourceKey(source);
  const [debounced, setDebounced] = useState<{ key: string | null; source: InstallmentCardSource | null }>({
    key: sourceKey,
    source,
  });
  useEffect(() => {
    if (debounced.key === sourceKey) return;
    const timer = setTimeout(() => setDebounced({ key: sourceKey, source }), INSTALLMENT_OPTIONS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `source` is identified by `sourceKey`; a new object with the same key is the same card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, debounced.key]);

  const active = enabled && !!paymentId && !!debounced.key && debounced.source !== null;
  const query = useQuery({
    queryKey: qk.payments.installmentOptions(paymentId ?? '', debounced.key ?? ''),
    queryFn: async ({ signal }) => {
      const card = debounced.source!;
      const body: InstallmentOptionsRequest = {
        ...(card.kind === 'bin' ? { bin: card.bin } : { savedCardId: card.savedCardId }),
        paymentId: paymentId!,
      };
      try {
        const res = await (isGuest
          ? paymentsApi.installmentOptionsGuest(body, { signal })
          : paymentsApi.installmentOptions(body, { signal }));
        return installmentOfferOf(res.data);
      } catch (error) {
        if (!signal.aborted && isServerOrNetworkFailure(error)) {
          captureException(error, {
            level: 'warning',
            tags: { flow: 'payment.installmentOptions', card_source: card.kind },
            extra: { paymentId, status: (error as { response?: { status?: number } })?.response?.status },
          });
        }
        throw error;
      }
    },
    enabled: active,
    retry: false,
    staleTime: Infinity,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  let state: InstallmentOptionsState;
  if (!enabled || !paymentId || !sourceKey) state = { status: 'idle' };
  else if (debounced.key !== sourceKey || query.isPending || query.isFetching) state = { status: 'loading' };
  else if (query.isError) state = { status: 'done', offer: { kind: 'single', reason: 'unavailable' } };
  else state = { status: 'done', offer: query.data };

  return { state, sourceKey, refetch: query.refetch };
}
