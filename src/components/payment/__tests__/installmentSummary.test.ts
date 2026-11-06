/**
 * Installment lines of a paid payment (plan 6.2): printed from the server's fields, never
 * computed; nothing for a single payment, an older API or a malformed answer.
 */
import i18n from '@/i18n/config';
import { installmentSummaryRows } from '../installmentSummary';

const t = i18n.t.bind(i18n);

it('count, fee and the charged total', () => {
  expect(installmentSummaryRows({ installmentCount: 3, installmentFeeAmount: 66.38, chargedAmount: 1066.38 }, t)).toEqual([
    { key: 'count', label: 'Taksit', value: '3 taksit' },
    { key: 'fee', label: 'Vade farkı', value: '66,38 TL' },
    { key: 'charged', label: 'Karttan çekilen tutar', value: '1.066,38 TL' },
  ]);
});

it('a zero fee reads "Vade farksız"; a missing fee leaves its line out', () => {
  expect(installmentSummaryRows({ installmentCount: 2, installmentFeeAmount: 0, chargedAmount: 1000 }, t)[1]).toEqual({
    key: 'fee',
    label: 'Vade farkı',
    value: 'Vade farksız',
  });
  expect(installmentSummaryRows({ installmentCount: 2, chargedAmount: 1000 }, t).map((r) => r.key)).toEqual([
    'count',
    'charged',
  ]);
});

it('single payment, no fields or a malformed answer: no lines', () => {
  expect(installmentSummaryRows({ installmentCount: 1, installmentFeeAmount: 0, chargedAmount: 350 }, t)).toEqual([]);
  expect(installmentSummaryRows(undefined, t)).toEqual([]);
  expect(installmentSummaryRows({}, t)).toEqual([]);
  expect(installmentSummaryRows({ installmentCount: 3 }, t)).toEqual([]);
  expect(installmentSummaryRows({ installmentCount: '3' as never, chargedAmount: 1 }, t)).toEqual([]);
});
