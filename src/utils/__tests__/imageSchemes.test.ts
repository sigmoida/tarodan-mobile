/**
 * Görsel şema sıkılaştırması.
 *
 * İki ayrı sızıntı vardı:
 *
 * 1. `resolveImageUrl` cihaz-yerel şemaları (`file:`, `content:`, `ph:`,
 *    `assets-library:`) OLDUĞU GİBİ geçiriyordu. Beyaz liste yalnız `[IMG:]`
 *    sınırında vardı; sunucudan/mesajdan gelen başka herhangi bir alan bu
 *    fonksiyona düşerse yerel dosya okuma denemesine ya da alıcının kendi
 *    galerisinden bir görselin ekranda belirmesine (UI spoof) dönüşebilir.
 *    Cihazda seçilen görseller bu yoldan GEÇMİYOR — ham `<Image source={{uri}}>`
 *    ile render ediliyorlar, o yüzden varsayılanı kapatmak akışı bozmuyor.
 *
 * 2. `[IMG:]` beyaz listesi dizin çıkışını yalnız düz `..` segmenti olarak
 *    arıyordu; `%2e%2e` ve ters bölü varyantları eleniyordu (bugün
 *    sömürülemez, ama beyaz listenin kendi sözü bu).
 */
import { resolveImageUrl, IMAGE_PLACEHOLDER } from '../imageUrl';
import { parseMessageContent } from '../contentFilter';

describe('resolveImageUrl schemes', () => {
  it('keeps remote images', () => {
    expect(resolveImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
  });

  it('keeps data URIs — the local placeholder is one', () => {
    expect(resolveImageUrl(IMAGE_PLACEHOLDER)).toBe(IMAGE_PLACEHOLDER);
  });

  it.each(['file:///etc/passwd', 'content://media/1', 'ph://ABC', 'assets-library://x'])(
    'refuses the device-local scheme %s',
    (uri) => {
      expect(resolveImageUrl(uri)).toBe(IMAGE_PLACEHOLDER);
    },
  );

  it('still resolves device-local URIs when the caller opts in', () => {
    expect(resolveImageUrl('file:///tmp/picked.jpg', 'detail', { allowDeviceUris: true })).toBe(
      'file:///tmp/picked.jpg',
    );
  });

  it('refuses javascript: whatever the caller asked for', () => {
    expect(resolveImageUrl('javascript:alert(1)', 'detail', { allowDeviceUris: true })).toBe(
      IMAGE_PLACEHOLDER,
    );
  });
});

describe('[IMG:] traversal variants', () => {
  it('drops a plain .. segment', () => {
    expect(parseMessageContent('[IMG:a/../../../etc/passwd]').images).toEqual([]);
  });

  it('drops a percent-encoded .. segment', () => {
    expect(parseMessageContent('[IMG:a/%2e%2e/%2e%2e/etc/passwd]').images).toEqual([]);
  });

  it('drops a backslash traversal', () => {
    expect(parseMessageContent('[IMG:a\\..\\..\\windows]').images).toEqual([]);
  });

  it('still accepts an ordinary storage key', () => {
    expect(parseMessageContent('[IMG:dev/messages/abc.jpg]').images).toEqual([
      'dev/messages/abc.jpg',
    ]);
  });
});
