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

describe('app/_layout yan menü (push çekmece)', () => {
  it('Stack SideMenuHost içinde; Toast/AlertDialog host\'ları kayan sarmalayıcının DIŞINDA', () => {
    const open = source.indexOf('<SideMenuHost');
    const close = source.indexOf('</SideMenuHost>');
    expect(open).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    const inside = source.slice(open, close);
    expect(inside).toMatch(/<Stack\b/);
    expect(inside).not.toMatch(/<ToastHost/);
    expect(inside).not.toMatch(/<AlertDialogHost/);
    expect(source.indexOf('<ToastHost')).toBeGreaterThan(close);
    expect(source.indexOf('<AlertDialogHost')).toBeGreaterThan(close);
  });
});
