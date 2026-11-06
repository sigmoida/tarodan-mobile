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

/** The answer without the counts direct-form refused for this card; none left = single payment. */
function withoutRefused(offer: InstallmentOffer, refused: number[]): InstallmentOffer {
  if (offer.kind !== 'options' || refused.length === 0) return offer;
  const options = offer.options.filter((o) => !refused.includes(o.count));
  return options.some((o) => o.count > 1)
    ? { ...offer, options }
    : { kind: 'single', reason: 'not_offered_for_payment' };
}

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
 * - The key holds the goods total the screen shows, and every new observer re-reads it
 *   (`staleTime: 0`): after a reload of the payment (409 `paymentAmountOutOfDate`) the
 *   remounted form never shows prices of the old amount.
 * - A refetch (after a 409) reads as `loading` again, so the old total is not payable meanwhile.
 * - The buyer's choice belongs to one card: any change of the card (another BIN, another saved
 *   card, even back to an earlier one) resets it to the single payment (plan 6.2).
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
  /** Goods total T the screen shows (`GET /payments/:id/status`); part of the key. */
  amount: number | undefined;
  isGuest: boolean;
  source: InstallmentCardSource | null;
  enabled: boolean;
}) {
  const { paymentId, amount, isGuest, source, enabled } = input;
  const sourceKey = installmentSourceKey(source);

  // Choice per card, with the counts direct-form refused for it (400 installmentNotOffered: not
  // offered again for this card). A card change resets both during render, so no stale count
  // is shown or payable for even one frame.
  const [choice, setChoice] = useState<{ key: string | null; count: number; refused: number[] }>({
    key: sourceKey,
    count: 1,
    refused: [],
  });
  const current = choice.key === sourceKey ? choice : { key: sourceKey, count: 1, refused: [] };
  if (current !== choice) setChoice(current);

  // The debounced card; its key is derived (one source of truth). No timer while disabled.
  const [debounced, setDebounced] = useState<InstallmentCardSource | null>(source);
  const debouncedKey = installmentSourceKey(debounced);
  useEffect(() => {
    if (!enabled || debouncedKey === sourceKey) return;
    const timer = setTimeout(() => setDebounced(source), INSTALLMENT_OPTIONS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `source` is identified by `sourceKey`; a new object with the same key is the same card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sourceKey, debouncedKey]);

  const active = enabled && !!paymentId && debounced !== null;
  const query = useQuery({
    queryKey: qk.payments.installmentOptions(paymentId ?? '', String(amount ?? ''), debouncedKey ?? ''),
    queryFn: async ({ signal }) => {
      const card = debounced!;
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
    staleTime: 0,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  let state: InstallmentOptionsState;
  if (!enabled || !paymentId || !sourceKey) state = { status: 'idle' };
  else if (debouncedKey !== sourceKey || query.isPending || query.isFetching) state = { status: 'loading' };
  else if (query.isError) state = { status: 'done', offer: { kind: 'single', reason: 'unavailable' } };
  else state = { status: 'done', offer: withoutRefused(query.data, current.refused) };

  const offer = state.status === 'done' ? state.offer : null;
  // Only an option of the current answer is payable; while it loads (or after a refusal) the
  // payment is single.
  const chosenOption =
    offer?.kind === 'options' && current.count > 1 ? offer.options.find((o) => o.count === current.count) ?? null : null;

  return {
    state,
    /** Identity of the card the state belongs to (`installmentSourceKey`). */
    sourceKey,
    /** The count above 1 the buyer picked and the current answer offers; `null` = single. */
    chosen: chosenOption,
    /** A count above 1 is picked and its price is being read: no payment until it is shown. */
    pending: current.count > 1 && state.status === 'loading',
    select: (count: number) => setChoice({ ...current, count }),
    resetToSingle: () => setChoice({ ...current, count: 1 }),
    /** direct-form refused the picked count for this card: back to single, not offered again. */
    refuseChosen: () =>
      setChoice({ ...current, count: 1, refused: current.count > 1 ? [...current.refused, current.count] : current.refused }),
    refetch: query.refetch,
  };
}
