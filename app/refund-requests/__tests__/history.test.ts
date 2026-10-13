/**
 * İade zaman çizelgesi etiketleri (Parite A-1.10).
 *
 * Ekran yalnız yedi aksiyonu tanıyordu; sunucunun yazdığı diğerleri
 * (`cancellation_refunded`, yönetici kararları, süre dolumları) ham adla
 * görünüyordu. Liste `apps/api/src/modules/refund/*` `appendHistory`
 * çağrılarından alındı.
 */
import i18n from '@/i18n/config';
import { REFUND_HISTORY_ACTION_KEYS, refundHistoryActionLabel } from '../_lib/history';

const t = i18n.getFixedT('tr');

/** Sunucunun bugün yazdığı aksiyonlar (2026-10 — tarodan-app `development`). */
const SERVER_ACTIONS = [
  'return_opened',
  'refund_completed',
  'cancelled_by_buyer',
  'cancellation_refunded',
  'cancellation_pending_admin_review',
  'pending_admin_review',
  'approved_by_admin',
  'approved_and_refunded_by_admin',
  'rejected_by_admin',
  'closed_by_admin',
  'marked_disputed',
  'financial_review_finalized',
  'return_dropoff_expired',
  'wait_for_delivery_expired',
];

describe('refundHistoryActionLabel', () => {
  it.each(SERVER_ACTIONS)('%s etiketli — ham ad ya da katalog anahtarı basılmaz', (action) => {
    const label = refundHistoryActionLabel(action, t);
    expect(REFUND_HISTORY_ACTION_KEYS[action]).toBeDefined();
    expect(label).not.toBe(action);
    expect(label).not.toMatch(/^refund\.history\./);
    expect(label).not.toBe(t('refund.history.unknown'));
  });

  it('her eşlenen anahtar İngilizce katalogda da çevrili', () => {
    const en = i18n.getFixedT('en');
    for (const key of Object.values(REFUND_HISTORY_ACTION_KEYS)) {
      expect(en(key)).not.toBe(key);
    }
  });

  it('bilinmeyen aksiyon ham adla değil genel etiketle basılır', () => {
    expect(refundHistoryActionLabel('some_new_action', t)).toBe('Talep güncellendi');
  });

  it.each([undefined, null, '', '   '])('boş aksiyon (%p) eskisi gibi "—" — etiket uydurulmaz', (action) => {
    expect(refundHistoryActionLabel(action, t)).toBe('—');
  });
});
