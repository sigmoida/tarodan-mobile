# src/stores — zustand (client/UI state only)

## Client state only

- Stores hold **only client/UI state**: auth token and session snapshot, cart,
  filters, drafts, prompt and cooldown flags, recent searches.
- A store **never fetches**. Server data belongs in React Query (see
  `src/lib/query/CLAUDE.md`). If a hook fetches and a store needs the result, the
  hook fetches and the store only holds it.
- Known debt: `authStore` still calls the auth API for session actions (login,
  refresh, logout). Messaging and favourites already moved to query hooks. Don't add
  new store calls.
- Route-local UI drafts may live next to the route (`_lib/*Draft.ts`) under the same
  rule.
- Reset per-user stores through `resetUserStores.ts` on logout.

## Selectors

- **Subscribe per field, never to the whole store.** `useAuthStore()` /
  `useCartStore()` with no argument re-renders the component on every store write.
- Use a selector (`useAuthStore((s) => s.user)`), `useShallow`
  (`zustand/react/shallow`) for a multi-field pick, and `useXxxStore.getState()`
  inside callbacks.
- Per-item derived state is a selector too:
  `useCartStore((s) => s.items.some((i) => i.productId === id))`.
- Enforced by `tarodan/no-whole-store-subscription` (warning; store files and tests
  are exempt).
- Test mocks must accept a selector: `(sel) => (sel ? sel(state) : state)`, plus
  `getState` if the code calls it.
