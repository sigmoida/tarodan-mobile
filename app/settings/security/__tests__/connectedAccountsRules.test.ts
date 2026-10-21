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
