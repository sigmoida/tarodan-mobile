/**
 * Sunucu 2026-07-29'dan beri (`0096579da`) rengi (`colors` ya da `color`) ve
 * `isBoxed`'ı zorunlu tutuyor; mobil ikisini de hiç göndermiyordu ve her ilan
 * oluşturma 400 alıyordu. Web ile aynı sözleşme: katalogdan seçilen renkler
 * `colors` slug listesi, kutu durumu boolean.
 */
import { buildCarModelPayload, buildColorAndBoxPayload, serverErrorMessage } from '../payload';

describe('buildColorAndBoxPayload', () => {
  it('seçilen renkleri `colors` slug listesi olarak gönderir', () => {
    expect(buildColorAndBoxPayload({ colors: ['blue', 'black'], isBoxed: 'boxed' })).toEqual({
      colors: ['blue', 'black'],
      isBoxed: true,
    });
  });

  it('kutusuz → false', () => {
    expect(buildColorAndBoxPayload({ colors: ['blue'], isBoxed: 'unboxed' }).isBoxed).toBe(false);
  });

  it('seçim yoksa alanları hiç koymaz — sunucudaki değer korunur (düzenleme)', () => {
    expect(buildColorAndBoxPayload({ colors: [], isBoxed: '' })).toEqual({});
  });
});

describe('buildCarModelPayload', () => {
  it('edit with a model sends its id', () => {
    expect(buildCarModelPayload('model-1', true)).toEqual({ carModelId: 'model-1' });
  });

  it('edit with the model cleared sends null, never an empty string (the API reads omitted as keep)', () => {
    const body = buildCarModelPayload('', true);
    expect(body).toEqual({ carModelId: null });
    expect(body.carModelId).not.toBe('');
  });

  it('create with a model sends its id', () => {
    expect(buildCarModelPayload('model-1', false)).toEqual({ carModelId: 'model-1' });
  });

  it('create without a model omits the key', () => {
    expect(buildCarModelPayload('', false)).not.toHaveProperty('carModelId');
  });
});

describe('serverErrorMessage', () => {
  const err = (message: unknown) => ({ response: { data: { message } } });

  it('tek metin mesajı aynen döner', () => {
    expect(serverErrorMessage(err('Ürün bulunamadı'), 'yedek')).toBe('Ürün bulunamadı');
  });

  it('doğrulama LİSTESİ gelirse ilk maddeyi döner — "İşlem başarısız" değil', () => {
    expect(serverErrorMessage(err(['Renk zorunludur', 'En az 3 resim yüklenmelidir']), 'yedek')).toBe(
      'Renk zorunludur',
    );
  });

  it('mesaj yoksa `error` alanına, o da yoksa yedeğe düşer', () => {
    expect(serverErrorMessage({ response: { data: { error: 'Bad Request' } } }, 'yedek')).toBe('Bad Request');
    expect(serverErrorMessage({}, 'yedek')).toBe('yedek');
    expect(serverErrorMessage(err([]), 'yedek')).toBe('yedek');
  });
});
