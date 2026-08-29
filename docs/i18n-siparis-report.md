# i18n — Orders / Sales / Offers / Refunds slice

Branch `feat/i18n-siparis`, based on `677a326`. Fourteen commits, one file (or
a small tightly-related group) per commit, landed continuously because this
worktree suffered several infrastructure disconnects mid-run.

## Scope actually touched

Everything named in the brief, plus five sibling files that render inside the
same screens and would otherwise have stayed Turkish-only in English mode
(not explicitly named in the brief, found by a text-literal sweep after the
named files were done):

- `app/orders/group/[id]/_components/GroupSections.tsx` (seller label)
- `app/orders/[id]/_components/OrderProductSeller.tsx` (condition line)
- `app/orders/[id]/_components/OrderAddressPrice.tsx` (phone line, no-address notice)
- `app/sales/_components/SalesEarnings.tsx` (two stat labels)
- `app/sales/_components/SalesFilterChips.tsx` (consumes the sales status hook, had to change signature)

Everything else in the brief's file list was migrated. Several files the
initial scan flagged as "already has `useTranslation`" turned out to be only
*partially* migrated (`SaleDetailBody.tsx`, `useSaleActions.ts`,
`ShipDialog.tsx`) — finished those too.

## Keys: reused vs added

Catalog grew by **110 keys** (`tr.json`: 6276 → 6386). Most literals reused an
existing key exactly; where reuse required a wording change, the diff is not
scattered — this section is a complete a list of it. New keys were added only
when no existing key carried the exact text, mostly under `order.*`, `offer.*`,
`sale.*` (new top-level namespace — no `sale.*` section existed before this
slice), and `refund.*`.

## Every wording change from reuse

- **`order.viewOrder`** ("Siparişi Gör") replaces OfferCard's
  "Siparişi Görüntüle" (view-order button linking from an accepted offer to
  its order).
- **`order.orderDetails`** ("Sipariş Detayları") replaces the singular
  "Sipariş Detayı" header used in `app/orders/[id]/index.tsx`,
  `app/orders/group/[id]/index.tsx`, and `app/sales/[id]/index.tsx`.
  `app/sales/__tests__/detail.test.tsx` asserted on the old singular form for
  the not-found state; updated.
- **`offer.counterOffer`** ("Karşı Teklif") reused for the offer *status*
  label (`countered`), previously a separate literal with the same text — no
  visible change, just consolidated to one key.
- **`order.markAsPreparing`**, **`order.trackOnSurat`**, **`order.requestRefund`**,
  **`order.cancelOrder`**, **`refund.dropOffAtSurat`**, **`refund.cancel.cta`**,
  **`order.refundWindowPassed`**, **`trade.dispute.cancelCta`** (as a generic
  "dismiss dialog" button), **`order.cancelShort`** — all reused verbatim, no
  wording change, listed only because they crossed the offers/sales/orders
  boundary (e.g. a sales-screen button reusing an `order.*` key).
- **`order.submitRefund`** ("Talep Oluştur") replaces
  `RefundRequestModal`'s "Talebi Gönder" submit button.
- **`order.refundQuantityHint`** ("Bu siparişte {quantity} adet var. Kaç
  adedini iade edeceğinizi seçin.") replaces "Bu siparişte {orderQuantity}
  adet var. Kaç adet iade edeceğinizi seçin." — same meaning, "Kaç adet" →
  "Kaç adedini".
- **`refund.cancel.confirmTitle`** ("İade Talebini İptal Et") replaces
  "İade talebini iptal et" — capitalisation only.
- **`refund.cancel.confirmBody`** ("İade talebiniz iptal edilecek. Devam
  edilsin mi?") replaces "Bu iade talebini iptal etmek istediğinize emin
  misiniz?" in `OrderActionCards.tsx`'s refund-cancel confirm dialog —
  statement-plus-question instead of a single question; same intent.
- **`order.uploadInvoicePdf`** ("Fatura Yükle (PDF)") replaces the seller
  invoice upload button's "Fatura Yükle" — adds a "(PDF)" suffix that was
  already used verbatim by an existing catalog key.
- **`order.viewOrder`** reused a second time is the same change noted above;
  not duplicated here.

No test other than `app/sales/__tests__/detail.test.tsx` and
`app/offers/__tests__/index.test.tsx` (key-echoing mock, expected) needed
updating for wording — every other reuse happened to match the existing text
exactly, and I verified each one against the real catalog value before using
it, not just by eyeballing similarity.

## Status maps — how each was handled, and label disagreements found

Per the brief: **never translate the status value the code compares against,
only its label.** Every map below now carries a `labelKey` (a `MessageKey`,
not a string) and a `use<Name>Config()` hook that resolves it with `t()` at
render time via `useMemo`, mirroring `src/lib/shared/refundStatus.ts` (already
built that way before this slice touched it).

1. **`src/lib/shared/orderStatus.ts`** (`uiOrderStatusMeta` /
   `useOrderStatusConfig`) — already done before this slice (found on the
   base commit). Buyer-facing single source, re-exported by
   `app/orders/_lib/ordersStatus.ts` and `app/orders/[id]/_lib/status.ts`.
2. **`app/sales/_lib/status.ts`** (`salesStatusMeta` / `useSalesStatusConfig`)
   — seller-facing. Six of eleven statuses (`processing`→`order.statusProcessing`,
   `delivered`, `completed`, `cancelled`, `refund_requested`, `refunded`)
   reuse the buyer map's labels verbatim (identical wording). Four statuses
   keep **new, seller-specific** `sale.*` keys because the code comment
   already documented the difference as deliberate:
   - `pending_payment`: `sale.statusPendingPayment` "Ödeme Bekliyor" vs
     buyer's `order.statusPendingPayment` "Ödeme Bekleniyor" — **disagreement**,
     not previously flagged in code comments.
   - `paid`: `sale.statusPaidPrepare` "Ödendi - Hazırla" vs buyer's
     "Ödendi" — **intentional**, documented in the source comment
     ("aksiyon-odaklı").
   - `shipped`: `sale.statusShipped` "Kargoda" vs buyer's
     `order.statusShipped` "Kargoya Verildi" — **disagreement**.
   - `awaiting_buyer_confirmation`: `sale.statusAwaitingConfirmation`
     "Onay Bekleniyor" vs buyer's `order.statusAwaitingConfirmation`
     "Onayınız Bekleniyor" — arguably intentional (seller vs "your"
     confirmation), but not documented as such before this slice.
3. **`app/offers/_lib/status.ts`** (`STATUS_CONFIG` / `translatedStatusConfig`)
   — reuses `payment.statusPending`, `trade.statusAccepted`,
   `trade.statusRejected`, `trade.statusCancelled`, `offer.counterOffer`,
   `offer.statusExpired` (all exact-text cross-domain reuse); only
   `payment_expired` needed a new key (`offer.statusPaymentExpired`).
4. **`app/order-track/_lib/status.ts`** (`STATUS_META` /
   `CLOSED_TRACK_HINT_KEYS`) — guest tracking screen, a **third** independent
   wording source for order statuses (it used to hardcode its own map, same
   as `src/utils/format.ts`'s `formatOrderStatus`). Eight of nine statuses
   reuse the buyer map's `order.status*` keys verbatim (exact text match,
   confirmed by diffing the catalog values, not by eye). `paid` again
   disagrees: this screen's own text was "Ödeme Alındı" — added
   `order.statusPaidReceived` to preserve it rather than silently switching
   to `order.statusPaid` ("Ödendi") and changing behaviour. So `paid` now has
   **three** different labels in production: `order.statusPaid` ("Ödendi",
   buyer detail), `sale.statusPaidPrepare` ("Ödendi - Hazırla", seller
   detail/list), `order.statusPaidReceived` ("Ödeme Alındı", guest track) —
   all three already existed as distinct visible strings before this slice;
   this is reported, not fixed, per the brief's instruction not to silently
   pick one.
5. **`app/orders/group/[id]/_lib/status.ts`** — already done before this
   slice (own `labelKey` map, found on base commit).
6. **`src/lib/shared/refundStatus.ts`** — already done before this slice.
7. **`src/utils/orderStatus.ts`** (`apiStatusToUi`) — pure status-code
   normalizer, no labels, nothing to translate.
8. **`src/utils/format.ts`** (`formatOfferStatus`, `formatOrderStatus`,
   `formatCondition`, `formatRelativeDate`) — **not in the brief's file
   list**, but consumed by in-scope files (`OfferDetailCards.tsx`,
   `SaleDetailBody.tsx`, `OrderProductSeller.tsx`). These functions already
   had a bilingual `tr`/`en` map with a `locale` parameter (pre-existing, not
   introduced by me) but every call site in this slice was omitting the
   parameter, so English mode silently rendered Turkish. Fixed the four call
   sites to pass `i18n.language` instead of restructuring the shared file
   itself (out of slice, shared with other screens, higher risk to touch
   under this scope). `formatOfferStatus`'s own map is a **fourth** wording
   source for offer statuses and a **third** for order statuses — not
   unified, flagged here per the brief's instruction.

**Net finding for the report:** the order-status vocabulary was never
unified before this slice and still isn't — I found four independent label
sources (buyer `orderStatus.ts`, seller `sales/_lib/status.ts`, guest
`order-track/_lib/status.ts`, and `src/utils/format.ts`'s `formatOrderStatus`)
plus a third for offer statuses (`offers/_lib/status.ts` vs
`formatOfferStatus`). I preserved every screen's existing visible text
(reusing where it was already identical, adding a new key where it wasn't)
rather than merging them, since merging is a behaviour change beyond this
slice's brief.

## Zod schema factory (`app/offers/_lib/schema.ts`)

`sellerCounterSchema`/`buyerCounterSchema` now take `t: TFunction` as their
last argument; the shared `amountSchema(t)` base was extracted so both
factories resolve `.refine()` messages at schema-build time instead of
freezing them at module load. Both callers (`CounterOfferModal.tsx`,
`BuyerCounterModal.tsx`) updated to pass `t` from `useTranslation()` and
depend on it in their `useMemo`. No dedicated schema unit test existed for
this file to route through `src/test-utils/schema.ts`; the two modal
integration tests (`app/offers/__tests__/*.test.tsx`) exercise the built
schema indirectly and still pass.

## Shared non-React modules

Two hooks in this slice are plain functions with `useState` (not React
components) that fire `appAlert`/`setError` from callbacks —
`useOfferDetail.ts`'s mutations, `useOfferActions.ts`, `useDoCounterOffer.ts`,
`useDoBuyerCounter.ts`, `useSaleActions.ts`, `useOrderTrack.ts`, and
`useRefundRequests.ts`. Followed the pattern already established in
`useSaleActions.ts` (found partially applied on the base commit) and
documented in `src/lib/payment/paytrDirectForm.ts`: `import i18n from
'@/i18n/config'` and call `i18n.t(...)` **inside the callback**, never at
module scope, so the message resolves in whatever language is active when
the mutation actually settles rather than freezing at import time.

`src/lib/shared/orderCancellation.ts` and `src/lib/shared/orderStatus.ts`
were already correct on the base commit (pure `labelKey`-returning
functions, translated by the caller's `useTranslation`) — no changes needed.

## Apostrophe check

Ran a script over every `order.*`/`offer.*`/`sale.*`/`refund.*` (plus
`common.info`/`common.add`) value I added or edited this session, looking for
a lone `'` followed later in the same string by a `{` (the actual danger:
ICU quoting would swallow a placeholder). Zero matches. Two values contain a
doubled `''` deliberately:
- `offer.buyerCounterMustBeLower` (EN): "The seller''s counter-offer is
  {amount}...." — apostrophe precedes `{amount}`, doubled.
- `order.uploadInvoicePdfNotice` (TR): "fatura PDF''i yükleyin..." — no
  placeholder after it in this particular string, but doubled anyway per the
  blanket rule rather than relying on the "no placeholder after it" argument
  holding forever if the string is edited later.
Other Turkish values with plain unescaped apostrophes (e.g. none introduced
in this slice) were checked and none exist in my additions — verified by the
same script, not by inspection alone.

## Behaviour

No mutation timing, invalidation, or modal-close-before-mutation ordering was
touched anywhere. Every `onClose()` still fires before its mutation's
`.mutate()` call in `CounterOfferModal.tsx` and `BuyerCounterModal.tsx`
(unchanged, verified by re-reading the diff).

## Tests updated

- `app/offers/__tests__/index.test.tsx` — three assertions (`"Kabul Et"` →
  `"offer.acceptOffer"`, etc.) and the empty-state/tab-label assertions,
  because this suite mocks `useTranslation` to echo the key rather than
  render the catalog.
- `app/sales/__tests__/detail.test.tsx` — one assertion updated for the
  `order.orderDetails` reuse (see wording-changes section above).

All other suites in this slice's directories render the real catalog via
`renderWithProviders` and needed no changes because every reused key's text
matched the literal it replaced exactly (verified per-key before using it).

## Gates

- `npx tsc --noEmit` — clean, 0 errors.
- `npx eslint . --ext .ts,.tsx` — **0 errors**, 1105 warnings (tracked
  baseline ~1106; not exceeded).
- `npx jest` — **210 suites / 1671 tests**, all green.

## Commits

Fourteen commits on `feat/i18n-siparis`, roughly one screen-section per
commit (offers status/schema/card, offers tabs/empty/actions, offer detail,
sales list, useSaleActions/ShipDialog, sale detail, OrderStatusCard, orders
list/detail header, order action/invoice cards, RefundRequestModal +
group header, guest order-track, offers loading/error, refund-requests, and
a final sweep-cleanup commit for five sibling files not explicitly named in
the brief).
