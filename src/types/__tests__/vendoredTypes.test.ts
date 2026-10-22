/**
 * Pins the vendored tarodan-app types: the exported names and the rules mobile
 * relies on, so a re-vendor that drops or renames something fails here.
 *
 * Optional source check: set `TARODAN_APP_ROOT` to a tarodan-app checkout and
 * the vendored files are also compared byte for byte (minus their 3-line
 * header) with `packages/types/src`. CI has no sibling checkout, so this part
 * is skipped there.
 */
import fs from 'fs';
import path from 'path';

import * as boost from '../boost';
import * as cardAction from '../product-card-action';
import * as negotiatedAmount from '../negotiated-amount';
import { CONSENT_DOCUMENT_I18N_KEYS, CONSENT_DOCUMENT_KEYS } from '@/lib/shared/legalConsent';

const VENDORED_HEADER_LINES = 3;

describe('vendored boost types', () => {
  it('exports the settings, rules and helpers', () => {
    expect(Object.keys(boost).sort()).toEqual(
      [
        'BOOST_ADMIN_REASON_MAX_LENGTH',
        'BOOST_ADMIN_REASON_MIN_LENGTH',
        'BOOST_ENABLED_SETTING',
        'BOOST_GRANT_MAX_DAYS',
        'BOOST_GRANT_MIN_DAYS',
        'BOOST_OFFER_MAX',
        'BOOST_OFFER_SINCE_SETTING',
        'BOOST_OFFER_WINDOW_DAYS',
        'BOOST_REMINDER_LEAD_HOURS',
        'BOOST_SOURCES',
        'BOOST_STATUSES',
        'MY_BOOSTS_DEFAULT_LIMIT',
        'MY_BOOSTS_MAX_LIMIT',
        'MY_BOOST_STATES',
        'MY_BOOST_STATE_STATUSES',
        'boostOfferSince',
        'boostPriceMatches',
        'isBoostEnabled',
      ].sort(),
    );
  });

  it('boostPriceMatches compares in whole kurus and fails closed', () => {
    expect(boost.boostPriceMatches(59.9, 59.9)).toBe(true);
    expect(boost.boostPriceMatches(59.899999, 59.9)).toBe(true);
    expect(boost.boostPriceMatches(59.89, 59.9)).toBe(false);
    expect(boost.boostPriceMatches(Number.NaN, 59.9)).toBe(false);
    expect(boost.boostPriceMatches(59.9, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('a missing boost_enabled setting means on; only "false" turns it off', () => {
    expect(boost.isBoostEnabled(undefined)).toBe(true);
    expect(boost.isBoostEnabled('')).toBe(true);
    expect(boost.isBoostEnabled(' FALSE ')).toBe(false);
  });
});

describe('vendored product card action', () => {
  it('exports the action rule', () => {
    expect(Object.keys(cardAction).sort()).toEqual(['productCardAction']);
  });
});

describe('vendored negotiated amount ceiling', () => {
  it('exports the ceiling and its check', () => {
    expect(Object.keys(negotiatedAmount).sort()).toEqual(
      ['TL_NEGOTIATED_AMOUNT_MAX', 'exceedsTlNegotiatedAmountMax'].sort(),
    );
  });

  it('is 9,999,999 TL; the ceiling itself is allowed, either sign', () => {
    expect(negotiatedAmount.TL_NEGOTIATED_AMOUNT_MAX).toBe(9_999_999);
    expect(negotiatedAmount.exceedsTlNegotiatedAmountMax(9_999_999)).toBe(false);
    expect(negotiatedAmount.exceedsTlNegotiatedAmountMax(-9_999_999)).toBe(false);
    expect(negotiatedAmount.exceedsTlNegotiatedAmountMax(9_999_999.01)).toBe(true);
    expect(negotiatedAmount.exceedsTlNegotiatedAmountMax(-9_999_999.01)).toBe(true);
  });
});

describe('consent document catalog', () => {
  it('keeps the eight documents, in the source order', () => {
    expect(CONSENT_DOCUMENT_KEYS).toEqual([
      'terms',
      'privacy',
      'kvkk',
      'distance_sales',
      'cookies',
      'marketing',
      'platform_service_sales',
      'withdrawal_waiver',
    ]);
  });

  it('has a title key for every document', () => {
    expect(Object.keys(CONSENT_DOCUMENT_I18N_KEYS)).toEqual([...CONSENT_DOCUMENT_KEYS]);
  });
});

const appRoot = process.env.TARODAN_APP_ROOT;
const describeWithSource = appRoot ? describe : describe.skip;

describeWithSource('against the tarodan-app source (TARODAN_APP_ROOT)', () => {
  const body = (file: string) =>
    fs.readFileSync(file, 'utf8').split('\n').slice(VENDORED_HEADER_LINES).join('\n').trimStart();

  it.each(['boost', 'product-card-action', 'negotiated-amount'])('%s matches packages/types/src', (name) => {
    const vendored = body(path.join(__dirname, '..', `${name}.ts`));
    const source = fs.readFileSync(path.join(appRoot!, 'packages/types/src', `${name}.ts`), 'utf8');
    expect(vendored).toBe(source.trimStart());
  });

  it('consent document keys match legal-consent.ts', () => {
    const source = fs.readFileSync(
      path.join(appRoot!, 'packages/types/src/legal-consent.ts'),
      'utf8',
    );
    const block = /CONSENT_DOCUMENT_KEYS = \[([^\]]*)\]/.exec(source)![1];
    const keys = [...block.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
    expect([...CONSENT_DOCUMENT_KEYS]).toEqual(keys);
  });
});
