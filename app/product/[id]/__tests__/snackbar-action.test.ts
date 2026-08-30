/**
 * Snackbar kısayolu METNE değil, yapısal bir alana bakar.
 *
 * Ekran eskiden "Sepete git" butonunu `message.includes('sepet')` ile
 * gösteriyordu. Mesaj katalogdan geliyor ve İngilizce'ye çevrildiğinde o kontrol
 * tutmuyor — buton sessizce kaybolurdu. Hiçbir davranış testi bunu yakalamazdı,
 * çünkü testler varsayılan dilde (tr) koşuyor. Bu yüzden kural KAYNAK üzerinde
 * çivileniyor: aynı hatanın geri gelmesi tek satırlık bir değişiklik.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf8');

describe('sepete ekleme snackbar kısayolu', () => {
  it('kısayol mesajın yanında AYRI bir alanda taşınır', () => {
    expect(read('_hooks/useProductActions.ts')).toContain("action?: 'goToCart'");
  });

  it('ekran kısayolu o alandan okur', () => {
    expect(read('index.tsx')).toContain("actions.snackbar.action === 'goToCart'");
  });

  it('mesaj metnine bakan eski kural geri gelmez', () => {
    expect(read('index.tsx')).not.toContain('snackbar.message.includes(');
  });
});
