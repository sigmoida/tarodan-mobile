/**
 * The pure rules of the Connected accounts rows (ADR 0012, web `ConnectedAccountsSection`): which
 * providers get a row, Connect or the platform hint, the D1 flag from `canUnlinkProvider`, and
 * which refusals re-read the list.
 */
import { SIGN_IN_METHODS_ERROR_CODES, type SignInMethods } from '@/types/sign-in-methods';
import { connectOffer, connectedAccountRows, isStaleListRefusal } from '../_lib/connectedAccounts';

const both = { google: true, apple: true };
const none = { google: false, apple: false };
const appleOnly: SignInMethods = {
  hasPassword: false,
  providers: [{ provider: 'apple', email: null, linkedAt: '2026-10-01T00:00:00.000Z' }],
};

describe('connectOffer', () => {
  it('a provider shown on this device can be connected on any platform', () => {
    expect(connectOffer('google', both, 'android')).toEqual({ kind: 'connect' });
    expect(connectOffer('apple', both, 'ios')).toEqual({ kind: 'connect' });
  });

  it('Apple off iOS: the iOS-only hint (ADR 0012)', () => {
    expect(connectOffer('apple', none, 'android')).toEqual({
      kind: 'hint',
      hint: 'mobile.connectedAccounts.appleIosOnly',
    });
  });

  it('Google off on Android: the website hint', () => {
    expect(connectOffer('google', none, 'android')).toEqual({
      kind: 'hint',
      hint: 'mobile.connectedAccounts.googleUnavailableAndroid',
    });
  });

  it('a provider missing on iOS (build without a client, device without Apple): no row, as web', () => {
    expect(connectOffer('google', none, 'ios')).toEqual({ kind: 'hidden' });
    expect(connectOffer('apple', none, 'ios')).toEqual({ kind: 'hidden' });
  });
});

describe('connectedAccountRows', () => {
  it('keeps the provider order of the contract and always shows a linked provider', () => {
    const rows = connectedAccountRows(appleOnly, none, 'ios');
    expect(rows.map((r) => r.provider)).toEqual(['apple']);
    expect(rows[0]).toMatchObject({ linked: appleOnly.providers[0], offer: null });
  });

  it('D1: an Apple-only account cannot drop Apple (Apple alone does not count, but it is its last)', () => {
    const [google, apple] = connectedAccountRows(appleOnly, both, 'ios');
    expect(google).toMatchObject({ provider: 'google', linked: undefined, canUnlink: false, offer: { kind: 'connect' } });
    expect(apple).toMatchObject({ provider: 'apple', canUnlink: false });
  });
});

/**
 * Every account shape (password or not, each set of links) on every device kind. The expected
 * values are written out (the D1 table of the delta and the ADR 0012 offers), not derived from
 * `canUnlinkProvider`, so a drift in either the rule or the row model fails here.
 */
describe('every account shape on every device (D1, at most one per provider, ADR 0012)', () => {
  type P = 'google' | 'apple';
  const account = (hasPassword: boolean, ...linked: P[]): SignInMethods => ({
    hasPassword,
    providers: linked.map((provider) => ({ provider, email: null, linkedAt: '2026-10-01T00:00:00.000Z' })),
  });
  // Disconnect allowed (D1): a password keeps every link removable; without one, only a link
  // whose removal leaves Google. Apple alone does not count.
  const ACCOUNTS: [string, SignInMethods, Partial<Record<P, boolean>>][] = [
    ['password, nothing linked', account(true), {}],
    ['password, Google', account(true, 'google'), { google: true }],
    ['password, Apple', account(true, 'apple'), { apple: true }],
    ['password, Google and Apple', account(true, 'google', 'apple'), { google: true, apple: true }],
    ['no password, Google', account(false, 'google'), { google: false }],
    ['no password, Apple', account(false, 'apple'), { apple: false }],
    ['no password, Google and Apple', account(false, 'google', 'apple'), { google: false, apple: true }],
    ['no password, Apple then Google', account(false, 'apple', 'google'), { google: false, apple: true }],
  ];
  // The offer of a provider that is not linked, per device kind.
  const DEVICES: [string, string, { google: boolean; apple: boolean }, Record<P, unknown>][] = [
    ['iOS', 'ios', both, { google: { kind: 'connect' }, apple: { kind: 'connect' } }],
    [
      'Android, Google on',
      'android',
      { google: true, apple: false },
      { google: { kind: 'connect' }, apple: { kind: 'hint', hint: 'mobile.connectedAccounts.appleIosOnly' } },
    ],
    [
      'Android, Google off',
      'android',
      none,
      {
        google: { kind: 'hint', hint: 'mobile.connectedAccounts.googleUnavailableAndroid' },
        apple: { kind: 'hint', hint: 'mobile.connectedAccounts.appleIosOnly' },
      },
    ],
  ];
  const CASES = ACCOUNTS.flatMap(([a, methods, unlink]) =>
    DEVICES.map(([d, platform, visible, offers]) => [`${a} / ${d}`, methods, unlink, platform, visible, offers] as const),
  );

  it.each(CASES)('%s', (_label, methods, unlink, platform, visible, offers) => {
    const rows = connectedAccountRows(methods, visible, platform);
    // One row per provider, in the contract order, on every device kind (none is hidden here).
    expect(rows.map((r) => r.provider)).toEqual(['google', 'apple']);
    for (const row of rows) {
      const linked = methods.providers.find((p) => p.provider === row.provider);
      if (linked) {
        // A linked provider never offers Connect (at most one per provider) on any platform,
        // and Disconnect follows D1.
        expect(row).toMatchObject({ linked, offer: null, canUnlink: unlink[row.provider] });
      } else {
        expect(row).toMatchObject({ linked: undefined, canUnlink: false, offer: offers[row.provider] });
      }
    }
  });
});

describe('isStaleListRefusal', () => {
  it.each([
    [SIGN_IN_METHODS_ERROR_CODES.providerAlreadyLinked, true],
    [SIGN_IN_METHODS_ERROR_CODES.providerLinkedToOtherAccount, true],
    [SIGN_IN_METHODS_ERROR_CODES.providerNotLinked, true],
    [SIGN_IN_METHODS_ERROR_CODES.lastSignInMethod, true],
    [SIGN_IN_METHODS_ERROR_CODES.providerTokenInvalid, false],
    [SIGN_IN_METHODS_ERROR_CODES.reauthRequired, false],
    [null, false],
  ])('%s -> %s', (code, stale) => {
    expect(isStaleListRefusal(code)).toBe(stale);
  });
});
