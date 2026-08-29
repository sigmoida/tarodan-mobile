# i18n slice: messaging & notifications

Branch: `feat/i18n-mesaj`, based on `d3f119a`.

## Scope covered

- `app/messages/[threadId]/` — `_hooks/{useMessageThread,useTypingIndicator,useAutoScroll}`,
  `_lib/{helpers,scroll}`, `_components/{MessageInputBar,MessageThreadHeader,MessageList,TypingIndicator}`
- `app/messages/new/` — `index.tsx`, `_hooks/useNewMessage.ts`, `_components/NewMessageBody.tsx`
- `app/(tabs)/messages/` — `index.tsx`, `_hooks/useMessagesTab.ts`, `_lib/helpers.ts`, `_components/ThreadRow.tsx`
- `app/(tabs)/notifications/` — `index.tsx`, `_hooks/useNotifications.ts`, `_components/{NotificationsHeader,NotificationRow}`, `_lib/styles.ts`
- Shared: `src/stores/messagesStore.ts`, `src/lib/messaging/normalize.ts`, `src/hooks/messaging/mutations.ts`,
  `src/services/push.ts`, `src/utils/notificationRoute.ts`, plus `src/utils/format.ts` (extended, not owned by this slice's file list, but required to fix relative time — see below)

`useTypingIndicator.ts`, `useAutoScroll.ts`, `_lib/scroll.ts`, `MessageList.tsx`, `useNotifications.ts`,
and `_lib/styles.ts` (both notifications and messages) had no user-facing literals — no changes needed there.
`notificationRoute.ts` needed no changes either: it only builds deep-link route strings, which the
"do not translate what is not language" rule explicitly excludes.

## Keys reused vs added

Reused (no wording change): `order.permissionRequired`, `common.error`, `message.sendFailed`,
`profile.block`, `profile.report`, `discount.discard`, `message.typeMessage`, `common.loading`,
`common.more`, `common.send`, `message.prefilledInquiry`, `product.seller`, `common.message`,
`address.goPremium`, `common.login`, `common.noResults`, `common.user`, `message.youPrefix`,
`notification.notifications`, `common.default`, `nav.trades`.

Reused **with a visible wording change** (listed per the task's instructions):
- `order.galleryPermissionBody`: "Resim göndermek için galeri erişim izni gerekli." → "Fotoğraf eklemek için galeri erişim izni gerekiyor." (gallery-permission alert body in `useMessageThread.handleAttachImage`)
- `message.removeImage`: "Resmi kaldır" → "Fotoğrafı kaldır" (pending-image remove button's accessibility label in `MessageInputBar`)
- `notification.noneYet`: "Henüz bildirimin yok" → "Henüz bildirim yok" (notifications empty-state title)
- `notification.markAllReadShort`: "Tümünü Okundu" → "Tümünü oku" (notifications header button)
- `message.typing`: "yazıyor…" (ellipsis char) → "yazıyor..." (three dots, same catalog value used by the tab-search "typing" indicator elsewhere)

Added (no existing match found): `message.blockUserTitle/blockUserBody/blockUserError/blockedTitle/
blockedBody/viewProfile/imageUploadedNoUrl/imageSendFailed/tryAgainBody/today/yesterday/
pendingImageReady/messageLimitReached/dailyLimitWarning/dailyLimitReached/recipient/
searchUserPlaceholder/userSearchUnsupported/aboutProduct/loginToView/dailyMessageCount/
noMessagesYet/tryDifferentSearch/startConversationShort/generalMessage/dailyLimitError`;
`notification.loginToView/loginPromptDesc/emptyListDesc`; `time.relative.justNow/minutes/hours/days`.

## Relative time / pluralisation

Found the existing helper `src/utils/format.ts#formatRelativeDate` (already used by
`NotificationRow`, plus two out-of-scope callers in `app/offers/[id]` and `app/sales/[id]`) and
**extended it instead of writing a second one**, per the task instructions. It already took a
`locale: string` second argument with hardcoded TR/EN literals; I added an overload where the
second argument can be an i18next `TFunction` instead. When a `TFunction` is passed, the function
reads new `time.relative.*` catalog keys (with a real ICU `{count, plural, one{...} other{...}}`
form for English days, matching the exact grammar the original hardcoded branch already had —
`"${diffDay} day${diffDay===1?'':'s'} ago"`). When a plain string is passed (the untouched
existing behaviour), the old hardcoded TR/EN literals are used unchanged — `par-format-parity.test.ts`
locks that path and still passes, so the two out-of-scope callers are unaffected. `NotificationRow`
now calls `formatRelativeDate(item.createdAt, t)`.

Minutes/hours don't need ICU plural in either language here: Turkish never inflects, and the
established English wording uses invariant abbreviations ("min"/"hr ago"), which was already
correct — only "day"/"days" needed the plural branch, so that's the only key using full ICU syntax.

## server.notification.*

Checked `src/i18n/lib/catalog/{tr,en}.json` under `server.notification.*` before adding anything.
It holds the server-authored notification title/body strings (pure `{arg}` interpolation,
bulk-exempted from the translation-completeness test). `NotificationRow.tsx` renders
`item.title` / `item.message` directly from the API payload — I left those untouched; only the
relative-time caption underneath them (client-rendered) was translated.

## Non-React modules

- `src/services/push.ts`: Android notification-channel `name` fields (shown in the OS notification
  settings) now call `i18n.t(...)` (imported from `@/i18n/config`) inside
  `registerForPushNotifications()`, i.e. at call time when the function runs, not at module load.
  Same shape as `src/lib/payment/paytrDirectForm.ts`.
- `src/stores/messagesStore.ts`: `getOtherParticipant`'s `"Kullanıcı"` fallback now calls
  `i18n.t('common.user')` inside the selector function body — the store's initial state and
  actions are unchanged, no fetch/translation was added at module scope.
- `src/lib/messaging/normalize.ts`: same `i18n.t('common.user')` call-time pattern for
  `normalizeThread`'s participant-name fallback.
- `src/hooks/messaging/mutations.ts`: `DailyMessageLimitError`'s thrown `.message` (surfaced
  verbatim by `useMessageThread`'s generic catch) now resolves `message.dailyLimitError` in the
  constructor — also call-time, since the class is only instantiated when the limit is actually hit.
- `src/utils/notificationRoute.ts`: no changes — it only returns route strings, not language.

## Tests updated

- `app/messages/__tests__/new.test.tsx` — assertions updated to match the `t(k) => k` mock
  convention already used by this suite.
- `app/(tabs)/__tests__/messages.test.tsx` — same, plus the daily-limit-count assertion switched
  from checking the interpolated string to checking the key (the mock doesn't interpolate).
- `app/(tabs)/__tests__/notifications.test.tsx` — this suite does **not** mock `react-i18next` (uses
  the real catalog), so its assertions were updated to the new reused-with-wording-change strings
  ("Henüz bildirim yok", "Tümünü oku") rather than the old literals.
- No other test in the repo asserted on the touched strings (checked via grep for each literal
  before editing, and confirmed the touched-string test files span the full slice).

## Gates

- `npx tsc --noEmit` → clean, 0 errors.
- `npx eslint . --ext .ts,.tsx` → 0 errors, 1107 warnings (baseline ~1106; the two `any` warnings
  in `messagesStore.ts` predate this slice — unchanged by my edits, just now adjacent to a `git diff`
  line).
- `npx jest` → 210 suites / 1672 tests, all green.
