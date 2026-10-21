# src/lib/query — server state

React Query is the **single server state**. `client.ts` (QueryClient), `keys.ts`
(central key registry), `useAppMutation.ts` (the write helper), `retry.ts`,
`infinite.ts`, `persist.ts`, `focusManager.ts`.

**Never** `useState` + `useEffect` + `api` by hand, and **never** fetch inside a
zustand store.

## Query hooks

- Lists and reads -> a query hook in the route's `_hooks/` (`useXxx.ts` ->
  `{ data, isLoading, ... }`), or in `src/hooks/` when several routes use it.
- The hook owns the `queryKey` (from `qk`) and the `queryFn` (calling `@/lib/api`).
  The screen never calls `api` and never writes a key.
- A query hook may own a side effect tied to its data (e.g. `useProduct` posts the
  view count and invalidates lists).
- 4xx is not retried: use `retryUnlessClientError` (single source), already the
  default.

## Mutation hooks

- Writes -> a mutation hook (`useDoXxx.ts`) that owns the feedback (toast /
  `appAlert`) and `invalidateQueries`. This is the **only** way to mutate, so lists
  refresh by themselves; no manual `refetch()`, no `isSubmitting` + try/catch in the
  screen.
- Prefer `useAppMutation(fn, { invalidates: [qk.x.all], success, error })` (the
  mobile twin of web `useWebMutation`).
- A per-item spinner comes from `mutation.variables` (e.g. `pendingOfferId`), not a
  `useState`.
- A shared invalidation set lives in one helper (e.g. `useInvalidateOffers`,
  `src/components/listing/_lib/invalidate.ts`).
- The listing invalidation set (`listingCacheKeys`) includes the trade pickers' "my
  tradeable listings" prefix (`qk.trades.myTradeableAll`): a listing change must reach
  both pickers. A new cache that lists the user's own listings joins that set. All
  trade pickers (both sides) also refetch on every open and on screen focus
  (`app/trade/_lib/picker.ts`, `useRefetchStaleOnFocus`), because a listing can change
  where no client mutation runs (admin approval, the other party's edits). The pickers are
  paged `useInfiniteQuery`s (`app/trade/_hooks/usePagedPicker.ts`, "Show more" button, server
  `tradeOnly` filter): a refetch reloads every loaded page, their keys carry the user id, and
  the same `myTradeableAll` prefix reaches them.
- In a modal form: close the modal, then `mutate` (see `src/ui/CLAUDE.md` › iOS modal
  rule).

## Query keys

- Every `queryKey` comes from `qk` (`@/lib/query`): `qk.<domain>.detail(id)`,
  `qk.products.all`. Never hand-write `['product', id]` inline; that is how
  `my-collections` vs `myCollections` drift crept in.
- Add new keys to `src/lib/query/keys.ts`. Enforced by `tarodan/no-inline-query-key`
  (warning; `keys.ts` and tests are exempt).

## Exceptions

Deliberate, documented at the call site; don't "fix" them for consistency.

- **Payment result and 3DS polling** (`app/payment/fail.tsx`, `app/payment/[id].tsx`,
  `src/components/CardPaymentForm.tsx`): these calls move money or release stock,
  and React Query's retry / refetch-on-focus semantics could run them twice. They
  are hand-written with one-shot guards.
- **File upload queue**: see `src/lib/api/CLAUDE.md` › File uploads.
- Any new exception needs the same kind of comment explaining why.
