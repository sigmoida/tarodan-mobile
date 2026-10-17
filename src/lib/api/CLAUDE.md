# src/lib/api — the axios surface

The only place that talks HTTP to the Tarodan API. Screens and components never call
it directly: query and mutation hooks do (see `src/lib/query/CLAUDE.md`).

## Domain modules

- Split by domain (`auth`, `products`, `catalog`, `orders`, `checkout`,
  `membership`, `messaging`, `trades`, `user`, `media`, `listings`, `consents`,
  `legalIdentity`, `hero`, `ads`, `app-config`, ...) behind a thin `client.ts`
  (axios instance + interceptors: auth refresh, request id, Accept-Language,
  network/session handling).
- Import domain APIs from `@/lib/api`. `src/services/api.ts` is a backward-compat
  barrel that re-exports `@/lib/api`; new code imports `@/lib/api` directly.
- Response DTOs come from `src/types` (vendored copy of tarodan-app
  `packages/types`) or a typed module-local interface. Before adding or changing a
  call, read the relevant contract delta (tarodan-ops `contracts/deltas/`, older ones
  in `docs/mobile-parity/`). When you implement a delta, add a contract fixture test.
- New response fields are treated as optional unless the contract says otherwise;
  the API stays backward compatible with live app versions.

## Paths

- Every variable that goes into a URL path is written with the `apiPath` tagged
  template (`@/lib/api/path`): ``apiPath`/trades/${id}/accept` ``. Each segment is
  validated and encoded, so a deep-link or push parameter cannot redirect a request to
  another endpoint. Query values go through axios `params`, never string-built.
- Enforced by `tarodan/encoded-api-path` (warning).

## Money values

- Prices, totals, commissions, fees and discounts come from the server. Never compute
  a money value on the client: print the server's breakdown (e.g. `pricing.summary`
  from `POST /orders/quote`) and send back the contract fields it requires
  (`expectedPricingHash`, `expectedShippingTariffVersion`).
- Money and payment changes need a behaviour-pinning test (tarodan-ops Definition of
  Done › Money / payment).

## File uploads

- Per-file progress/cancel/retry uploads (listing images) run outside React Query:
  image preparation (resize/compress, serial gate, timeout, abort, temp-file cleanup,
  `pickerQuality()`) lives in `src/lib/media`; the multipart part (`appendRNFile`,
  iOS URI rule) in `src/lib/api/formData.ts`; the queue in
  `src/components/listing/_lib/uploadQueue.ts`.
- **Every photo upload goes through `src/lib/media` first.**

## Errors

- User-facing error text comes from `errorText.ts` (`apiErrorMessage`) and the
  server's localised `server.*` keys; no hardcoded strings.
- Sentry gets only 5xx and network errors, never expected 4xx, and never PII (ids
  only). 4xx is not retried (`retryUnlessClientError` in `@/lib/query`).
