import type { ListingFormController } from '../_hooks/useListingForm';

/**
 * Yeni ilan ön koşulları (web `BankGate` + `AddressGate` + `canCreateListing`): banka hesabı
 * (IBAN) ve kargo çıkış adresi. Form ancak İKİSİ de açıkken görünür. Tek kaynak: ekran ve
 * `ListingRequirementGate` aynı görünümü buradan alır.
 *
 *  - `open`    : ön koşul sağlandı (ya da düzenleme)
 *  - `loading` : durum henüz bilinmiyor -> "ekle" denmez
 *  - `error`   : okunamadı -> "ekle" denmez, yeniden dene
 *  - `missing` : bilinen eksik -> ekleme istemi
 */
/**
 * İlan formunun IBAN kapısından banka hesabı ekranına giden adres. `from=listing`: kayıttan
 * sonra ekran ilan formuna geri döner (`useBankAccount`). Her iki giriş noktası (kapı istemi,
 * gönderim uyarısı) bunu kullanır.
 */
export const BANK_ACCOUNT_FROM_LISTING_HREF = '/settings/bank-account?from=listing';

export type GateState = 'open' | 'loading' | 'error' | 'missing';

type BankSlice = Pick<
  ListingFormController,
  'isEdit' | 'hasBankAccount' | 'bankAccountLoading' | 'bankAccountError'
>;
type AddressSlice = Pick<
  ListingFormController,
  'isEdit' | 'hasDispatchAddress' | 'dispatchAddressLoading' | 'dispatchAddressError'
>;

export function bankGateState(f: BankSlice): GateState {
  if (f.isEdit || f.hasBankAccount) return 'open';
  if (f.bankAccountLoading) return 'loading';
  if (f.bankAccountError) return 'error';
  return 'missing';
}

export function dispatchGateState(f: AddressSlice): GateState {
  if (f.isEdit || f.hasDispatchAddress) return 'open';
  if (f.dispatchAddressLoading) return 'loading';
  if (f.dispatchAddressError) return 'error';
  return 'missing';
}

/** İki kapının birleşik görünümü: tek loader / tek ErrorState / ekleme istemleri. */
export type GateView = 'open' | 'loading' | 'error' | 'prompts';

export function listingGateView(f: BankSlice & AddressSlice): {
  view: GateView;
  bank: GateState;
  address: GateState;
} {
  const bank = bankGateState(f);
  const address = dispatchGateState(f);
  const states = [bank, address];
  const view: GateView = states.includes('error')
    ? 'error'
    : states.includes('loading')
      ? 'loading'
      : states.includes('missing')
        ? 'prompts'
        : 'open';
  return { view, bank, address };
}

/** Form gizli mi? (herhangi bir ön koşul açık değil) */
export const listingGatesBlock = (f: BankSlice & AddressSlice): boolean =>
  listingGateView(f).view !== 'open';
