/**
 * Kök düzende AlertDialogHost kapıya (`gateShown`) bağlı olarak SÖKÜLMEMELİ: söküldüğünde kapanma
 * zamanlayıcısı gider ve basılan düğmenin onPress'i hiç çalışmaz (teklif ekranı "bekliyor"da
 * takılır). Host hep bağlı, kapı açıkken `suspended` ile askıya alınır.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', '_layout.tsx'), 'utf8');

describe('app/_layout AlertDialogHost', () => {
  it('koşullu bağlanmaz', () => {
    expect(source).not.toMatch(/gateShown\s*&&\s*<AlertDialogHost/);
    expect(source).not.toMatch(/!\s*gateShown\s*&&/);
  });

  it('kapı durumu suspended olarak geçilir', () => {
    expect(source).toMatch(/<AlertDialogHost\s+suspended=\{gateShown\}\s*\/>/);
  });
});
