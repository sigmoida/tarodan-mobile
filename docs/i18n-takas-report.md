# i18n — trade-remainder slice report

Branch: `feat/i18n-takas`, based on `677a326`.

## Scope

Everything around the trade detail screen's action layer / status
descriptions that the previous slice migrated: new-trade wizard, counter-offer
flow, trade-detail leftover components, trade list, and shared
`TradeCard`/`tradeStatus`/`isProductTradeOpen`/`TradeAddressPicker`/
`AwaitingConfirmationBanner`.

Two files in the brief needed no changes:
- `src/lib/shared/tradeStatus.ts` — already fully key-driven from an earlier slice.
- `src/utils/isProductTradeOpen.ts` — pure boolean derivation, no user-facing strings.

## `trade.*` keys extended, not duplicated

Confirmed by reading `_lib/status.ts` and grepping usages first. Reused
directly (no wording change) across this slice: `trade.statusAccepted`,
`trade.statusCompleted`, `trade.statusAtWarehouse`, `trade.counterOfferNumber`,
`trade.yourItems`, `trade.productsYouWant`, `trade.noListingsForTrade`,
`trade.iWillPay`, `trade.myTrades`, `trade.tradeSent`, `trade.sendFailed`,
`trade.completedSummaryTitle`, `trade.filterInTransit`, `trade.rejectTradeTitle`,
`trade.rejectTrade`, `trade.dispute.cancelCta`, `trade.acceptTrade`,
`trade.counterOffer` (as a key, see wording note below),
`trade.iReceivedIt`, `trade.tradeRequiresLogin`, `trade.selectDeliveryAddress`,
`trade.counterOfferSent`, `trade.noItemsShort`. Several previously-**unused**
`trade.*` keys turned out to be exactly what these unmigrated screens needed
(`trade.rejectReason`, `trade.rejectReasonPlaceholder`, `trade.completedSummaryDesc`,
`trade.createdAt`, `trade.safeTradeTitle`/`safeTradeDesc`, `trade.messagePlaceholder`,
`trade.noProductsFromSeller`, `trade.noTrades`, `trade.noTradesHint`,
`trade.selectAtLeastOne`, `trade.selectAtLeastOneWant`, `trade.selectAtLeastOneOffer`,
`trade.counterOfferIdentical`, `trade.loginToTrade`, `trade.productsYouOffer`,
`trade.sendTrade`) — a strong signal an earlier slice added the vocabulary but
never wired the screen.

## Keys reused with a visible wording change

Every one of these is a deliberate reuse decision (never a new near-duplicate
key), listed per the brief's requirement:

- `TradeProgressStepper`: "Depoya Kargo" / "Size Kargo" → `trade.stepShipToWarehouse`/`stepShippingToYou` → "Depoya Kargolanıyor" / "Size Kargolanıyor"
- `RejectTradeModal` label: "Sebep (opsiyonel)" → `trade.rejectReason` → "Red nedeni"
- `RejectTradeModal` placeholder: "Örn. Teklif uygun değil" → `trade.rejectReasonPlaceholder` → "Red nedeni (opsiyonel)" (loses the concrete example)
- `TradeStatusHeader` returning banner: "Takas Reddedildi" → `trade.returningBannerTitle` → "Takas reddedildi" (case only)
- `TradeStatusHeader` completed desc: "Takas başarıyla tamamlandı. İyi günlerde kullanın!" → `trade.completedSummaryDesc` → "Bu takas başarıyla tamamlandı. Aşağıda özet bilgiler yer alır."
- `TradeStatusHeader` date row: "Oluşturuldu" → `trade.createdAt` → "Oluşturulma"
- `NewTradeSteps` step3 address: "Teslimat Adresiniz" → `address.deliveryAddress` → "Teslimat Adresi" (standardized with `TradeActions`)
- `TradeAddressPicker` add button: "Yeni adres ekle" → `address.addNewAddress` → "Yeni Adres Ekle" (case)
- `NewTradeSteps`/`TradeCounterBody` cash title: "Nakit Fark" → `trade.cashDifferenceLine` → "Nakit fark" (case)
- `NewTradeSteps`/`TradeCounterBody` "Karşı taraf ödesin" → `trade.theyWillPay` → "Karşı taraf ödeyecek"
- `NewTradeSteps` step3 "Teklif Ettiğiniz Ürünler" → `trade.productsYouOffer` → "Teklif Edeceğiniz Ürünler"
- `NewTradeSteps` protection card: "Takas Koruma Programı" + short desc → `trade.safeTradeTitle`/`safeTradeDesc` → "Güvenli Takas" + longer desc
- `NewTradeSteps` submit: "Teklifi Gönder" → `trade.sendTrade` → "Takas Teklifi Gönder"
- `NewTradeSteps` message placeholder: "Teklif hakkında bir not ekleyin..." → `trade.messagePlaceholder` → "Satıcıya mesajınızı yazın..."
- `NewTradeSteps` step2 empty: "Bu satıcının takas için ürünü yok" → `trade.noProductsFromSeller` → "Bu satıcıdan kullanılabilir ürün yok"
- `useNewTrade` alert: "En az bir ürün seçin veya nakit farkı girin" → `trade.selectAtLeastOne` → "En az bir ürün seçin veya fark ekleyin"
- `useNewTrade` alert: "Karşı taraftan en az bir ürün seçmelisiniz" → `trade.selectAtLeastOneWant` → "Lütfen en az bir istediğiniz ürünü seçin"
- `NewTradeGate` login hint: "Takas teklifi vermek için giriş yapmalısınız" → `trade.loginToTrade` → "Takas teklifi göndermek için giriş yapmalısınız."
- `trades.tsx` empty title: "Henüz takas yok" → `trade.noTrades` → "Henüz takas teklifiniz yok"
- `trades.tsx` empty hint: "Beğendiğin bir ürüne takas teklifi göndererek başlayabilirsin." → `trade.noTradesHint` → "İlanlara göz atıp takas teklifi gönderebilirsiniz." (tone shift, informal→formal)
- `trades.tsx` retry button: "Yeniden dene" → `common.tryAgain` → "Tekrar Dene"
- counter screen loaded header: "Karşı Teklif Ver" → `trade.counterOffer` → "Karşı Teklif"
- `TradeCounterBody` submit: "Karşı Teklifi Gönder" → `trade.sendCounterOffer` → "Karşı Teklif Gönder" (grammatical case) — **test updated**, see below
- `useTradeCounter` alert: "En az bir ürün seçmelisiniz." → `trade.selectAtLeastOneOffer` → "Lütfen en az bir ürün seçin"
- `useTradeCounter` alert: "Karşı teklif önceki teklifle aynı. Lütfen ürün veya nakit farkında değişiklik yapın." → `trade.counterOfferIdentical` → "Önceki teklif ile aynı. Değişiklik yapmadan karşı teklif gönderemezsiniz."

## Label disagreement found (reported, not silently resolved)

`TradeProgressStepper`'s step labels for `shipping_to_warehouse` and
`shipping_to_recipients` now read "Depoya Kargolanıyor" / "Size Kargolanıyor"
(`trade.stepShipToWarehouse`/`stepShippingToYou`), while the single-source
status badge in `src/lib/shared/tradeStatus.ts` shows "Depoya Gönderiliyor" /
"Alıcılara Gönderiliyor" (`trade.statusShippingToWarehouse`/
`statusShippingToRecipients`) for the exact same status on the same screen.
This mismatch **pre-existed** the migration (the stepper had hardcoded
"Depoya Kargo"/"Size Kargo" literals, already different from the badge). I
reused the pre-existing-but-unused `trade.step*` keys rather than either
inventing a third wording or silently switching the stepper to the badge's
words, since I couldn't tell whether the shorter step-specific phrasing was
an intentional design choice for the narrow stepper column. Flagging for a
human call rather than resolving it myself. By contrast, `at_warehouse` had
no such conflict — I pointed the stepper directly at the single-source
`trade.statusAtWarehouse` key so that one is consistent.

`trade.stepPayment` was **not** reused from `checkout.stepPayment` even
though both currently render "Ödeme" — per mid-task correction, a checkout
step and a trade escrow step are different flows and coupling them risks the
trade wording having to bend if checkout's ever changes. Added a dedicated
`trade.stepPayment` key instead.

## New keys added (57)

All under `trade.*` unless noted. Full list: `tradeNumberTitle`,
`initiatorLabel`, `otherPartyItemsLabel`, `noItemsShort`, `totalValueLabel`,
`detailTitle`, `notFoundTitle`, `trackingCopied`, `countdownHint`,
`rejectModalDesc`, `stepPayment`, `confirmationBanner.{title,desc,expired,
timeLeft,confirming,confirmCta,reportProblem}`, `sentByMe`, `receivedByMe`,
`itemQuantityLabel`, `filterPending`, `filterCompleted`, `filterRejected`,
`listLoadFailedHint`, `noTradesFilteredHint`, `searchListingsCta`,
`stepMyItems`, `stepWantedItems`, `selectMyItemsTitle`, `selectWantedItemsTitle`,
`continueWithSelectedCount`, `cashDifferenceOptionalLabel`, `amountLabelSymbol`,
`tradeSummaryTitle`, `youWillPayLabel`, `yourMessageOptionalLabel`,
`premiumFeatureCreate`, `premiumFeatureCounter`, `premiumFeatureCash`,
`premiumFeatureProtection`, `counterOfferNotice`, `counterMyItemsTitle`,
`counterMyItemsSubtitle`, `counterTheirItemsTitle`, `counterTheirItemsSubtitle`,
`amountLabelTL`, `messageOptionalLabel`, `counterMessagePlaceholderLong`,
`summaryTitle`, `myTotalGiven`, `myTotalWanted`, `willPayCashShort`,
`willReceiveCashShort`, `counterSummaryHint`, `noChangesTitle`, and
`address.noAddressesPicker`.

All money/count-bearing keys carry ICU arguments (`{number}`, `{count}`,
`{name}`, `{myCount}`/`{theirCount}`) — nothing is concatenated. Two-sided
cash figures (`trade.willPayCashShort`/`willReceiveCashShort`,
`trade.youWillPayLabel`/`theyWillPay`) keep the same party addressed as the
original literal in every case; no numbers are baked into sentences.

## Non-React modules

`app/trade/[id]/_lib/derive.ts` is a plain function (`deriveTradeView`),
called directly from `index.tsx`, not a hook — can't call `useTranslation`.
Followed `src/lib/payment/paytrDirectForm.ts`'s pattern exactly: `import i18n
from '@/i18n/config'` at module scope, `i18n.t('common.user')` called **inside**
the function body at call time for the other-party display-name fallback (not
memoized at import time). `src/lib/shared/tradeStatus.ts` was already using
the hook form (`useTradeStatusConfig`/`useTradeStatusDetail`) from the earlier
slice; nothing to change there. `src/utils/isProductTradeOpen.ts` has no
strings.

## Module-scope label lists → build(t) factories

- `app/trades.tsx`'s `FILTERS` array (6 filter chips) became `buildFilters(t)`,
  called fresh inside the component body each render — was previously a
  module-scope literal array frozen at import time.
- `NewTradeSteps.tsx`'s `StepIndicator` built its 3-label array
  (`labels = [t(...), t(...), t(...)]`) inside the component body instead of
  the previous inline ternary of hardcoded literals.

## Apostrophe check

Ran the guard regex myself (main's `catalog-integrity.test.ts` doesn't yet
carry it on this branch, which is based on a commit before that guard
landed): `/(^|[^'])'[{}]/` over every flattened value in both `tr.json` and
`en.json`. Found exactly 7 hits in **both** locales — all under
`server.trade.cannot*InStatus` (e.g. `Takas durumu '{status}' kabul edilemez`).
These are pre-existing backend-notification strings, not part of this slice's
scope, and match the "seven catalog values...just fixed on main" the
coordinator described — so my branch predates that fix and will pick it up
at merge. None of the 57 keys I added contain an apostrophe touching a brace;
the one English apostrophe I did introduce (`{name}'s Items`, and a few
`I'll`/`You'll` forms) sits before a letter, which per the corrected rule
needs no escaping, and I left it single exactly as the rest of `en.json`
already does for `Don't`/`seller's profile`/etc.

## Tests updated

- `app/trade/__tests__/detail.test.tsx` — 6 assertions moved from literal
  Turkish text to catalog keys (the test mocks `react-i18next` with
  `t: (key) => key`, so once a literal moves into `t()` the mock renders the
  raw key): `"Takas bulunamadı"` → `"trade.notFoundTitle"`; `"Takas
  #TKS-501"` (×3) → `"trade.tradeNumberTitle"`; `"Kabul Edildi"` →
  `"trade.statusAccepted"` (both the badge and the newly-keyed stepper now
  render the same key); `"Takas Reddedildi"` → `"trade.returningBannerTitle"`;
  `"Kabul Et"`/`"Karşı Teklif"`/`"Reddet"` → `"trade.acceptTrade"`/
  `"trade.counterOffer"`/`"trade.rejectTrade"`; `"Ödeme"` (×2) →
  `"trade.stepPayment"`.
- `app/trade/counter/__tests__/counter.test.tsx` — this suite renders the
  **real** catalog (no `react-i18next` mock), so assertions were updated to
  match the actual reused-key text, not to a raw key: `'Karşı Teklifi
  Gönder'` → `'Karşı Teklif Gönder'` (×2, the `sendCounterOffer` reuse noted
  above), `'Nakit Fark'` → `'Nakit fark'` (×2, case), `'Karşı taraf ödesin'`
  → `'Karşı taraf ödeyecek'`. `'Vereceğim Ürünler'` and `'Özet'` needed no
  change — the new keys I added (`trade.counterMyItemsTitle`,
  `trade.summaryTitle`) were written to match the existing literal exactly.
- No dedicated tests existed for `RejectTradeModal`, `TradeAddressPicker`,
  `TradeCard`, `trades.tsx`, `NewTradeSteps`/`useNewTrade`/`NewTradeGate`, or
  `AwaitingConfirmationBanner` (the last is currently unused/unwired anywhere
  in the app).

## Gates

- `npx tsc --noEmit` — clean, no output.
- `npx eslint . --ext .ts,.tsx` — **0 errors**, 1106 warnings (matches the
  tracked baseline exactly).
- `npx jest` — **210 suites / 1671 tests, all passing** (matches the target
  in the brief).
- `node scripts/gen-keys.mjs` run after every catalog edit batch; final run
  before the last commit produced no diff beyond the regenerated file itself,
  which is committed.
