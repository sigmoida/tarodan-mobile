/**
 * Destek telefonu / WhatsApp hattı henüz yok; ekranlarda "0850 XXX XX XX" gibi
 * yer tutucular ve uydurma numaraları arayan düğmeler duruyordu (Apple 2.1/2.3).
 * Gerçek hat gelene kadar yalnız çalışan kanallar (e-posta, destek talebi) kalır.
 */
import { Linking } from 'react-native';
import i18n from '@/i18n/config';
import { buildContactOptions } from '../_lib/faq';

describe('Yardım — iletişim seçenekleri', () => {
  const options = buildContactOptions(i18n.t);

  it('yer tutucu numara göstermez', () => {
    for (const o of options) expect(o.subtitle).not.toMatch(/X{2,}/);
  });

  it('telefon ya da WhatsApp düğmesi yok — hiçbir seçenek numara aramaz', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    options.forEach((o) => o.action());
    for (const [url] of spy.mock.calls) expect(String(url)).not.toMatch(/^(tel:|https:\/\/wa\.me)/);
    spy.mockRestore();
  });
});
