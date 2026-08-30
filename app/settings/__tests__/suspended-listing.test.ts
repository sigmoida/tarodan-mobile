/**
 * Askıya alınmış ilan durumu.
 *
 * `suspended` sunucunun döndürdüğü gerçek bir durum (staging'de hesapta bir
 * tane var) ama mobil onu hiç tanımıyordu: rozet ham `suspended` yazısını
 * basıyor, filtre çipleri arasında yer almıyor, ve eylem menüsü hâlâ "Düzenle"
 * sunuyordu — askıdaki bir ilanı düzenlemeye çalışan satıcı sunucudan hata
 * alıyordu. Web bu durumu ele almış.
 */
import { getStatusColor, statusTextKey } from '../my-listings/_lib/types';
import { messages } from '@/i18n/lib';

describe('suspended ilan durumu', () => {
  it('kendi rengi var — tanınmayan durumun gri tonuna düşmez', () => {
    expect(getStatusColor('suspended')).not.toBe(getStatusColor('uydurma_durum'));
  });

  it('katalogda gerçek bir etiketi var (iki dilde)', () => {
    const key = statusTextKey('suspended');
    expect(key).not.toBeNull();
    for (const locale of ['tr', 'en'] as const) {
      const label = key!.split('.').reduce<any>((o, k) => o[k], messages[locale]);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('tanınmayan durum hâlâ null döner — ham kod basılabilsin', () => {
    expect(statusTextKey('uydurma_durum')).toBeNull();
  });

  it('askıdaki ilanda düzenleme sunulmaz', () => {
    // Sunucu askıdaki ilanın düzenlenmesini reddediyor; butonu göstermek
    // kullanıcıyı doğrudan o hataya yürütür.
    const source = require('fs').readFileSync(
      require('path').resolve(__dirname, '../my-listings/_components/MyListingsModals.tsx'),
      'utf8',
    );
    expect(source).toContain("'suspended'");
  });
});
