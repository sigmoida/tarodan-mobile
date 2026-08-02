/**
 * Task 4 (parite P0 #4) — `[IMG:]` ayrıştırıcısı yalnız mutlak `http(s)://` URL'i
 * yakalıyordu. Sunucu artık `folder=messages` yüklemeleri için API redirect
 * endpoint'i döndürüyor (bearer'lı yükleme, bkz. AppImage.test.tsx) ama bazı
 * yollarda çıplak S3 key / relatif yol da dönebilir — bu durumda kullanıcı
 * baloncukta ham `[IMG:dev/messages/x.jpg]` metnini görüyordu ve
 * `formatMessagePreview` sohbet listesinde "📷 Fotoğraf" yerine ham metni
 * basıyordu. Regex şemasız değerleri de kabul edecek şekilde genişletildi;
 * çözüm `resolveImageUrl`'e bırakılır (bu dosyanın kapsamı dışında).
 */
import { parseMessageContent, formatMessagePreview, embedImageInMessage } from '../contentFilter';

describe('parseMessageContent — [IMG:] ayrıştırma (task 4)', () => {
  it('mutlak http(s) URL yakalar (mevcut davranış — regresyon)', () => {
    const { text, images } = parseMessageContent('bak [IMG:https://cdn.x.com/a.jpg]');
    expect(images).toEqual(['https://cdn.x.com/a.jpg']);
    expect(text).toBe('bak');
  });

  it('çıplak S3 key yakalar (şemasız)', () => {
    const { text, images } = parseMessageContent('[IMG:dev/messages/x.jpg]');
    expect(images).toEqual(['dev/messages/x.jpg']);
    expect(text).toBe('');
  });

  it('web public relatif yolu yakalar (/ ile başlayan)', () => {
    const { images } = parseMessageContent('[IMG:/photos/x.jpg]');
    expect(images).toEqual(['/photos/x.jpg']);
  });

  it('API redirect uç noktasını (görev bağlamındaki gerçek yeni format) yakalar', () => {
    const { images } = parseMessageContent(
      '[IMG:https://api.tarodan.com/api/media/message-attachment/abc-123]'
    );
    expect(images).toEqual(['https://api.tarodan.com/api/media/message-attachment/abc-123']);
  });

  it("`]` sınırını korur — işaretten sonraki metni YUTMAZ", () => {
    const { text, images } = parseMessageContent('A[IMG:dev/x.jpg]B');
    expect(images).toEqual(['dev/x.jpg']);
    expect(text).toBe('AB');
  });

  it('boşluk sınırını korur — birden çok işaret + aradaki metni yutmaz', () => {
    const { text, images } = parseMessageContent('[IMG:a.jpg] merhaba [IMG:b.jpg]');
    expect(images).toEqual(['a.jpg', 'b.jpg']);
    expect(text).toBe('merhaba');
  });

  it('içeriği yoksa boş sonuç döner', () => {
    expect(parseMessageContent('')).toEqual({ text: '', images: [] });
  });

  it('görsel işareti yoksa metni olduğu gibi bırakır', () => {
    expect(parseMessageContent('sade metin mesajı')).toEqual({
      text: 'sade metin mesajı',
      images: [],
    });
  });
});

describe('formatMessagePreview — hem mutlak URL hem çıplak key için 📷 Fotoğraf basar (task 4)', () => {
  it('mutlak URL', () => {
    expect(formatMessagePreview('[IMG:https://cdn.x.com/a.jpg]')).toBe('📷 Fotoğraf');
  });

  it('çıplak S3 key — düzeltmeden önce ham metin sızıyordu', () => {
    expect(formatMessagePreview('[IMG:dev/messages/x.jpg]')).toBe('📷 Fotoğraf');
  });

  it('metin + çıplak key birlikte', () => {
    expect(formatMessagePreview('bak bu [IMG:dev/messages/x.jpg]')).toBe('bak bu 📷 Fotoğraf');
  });

  it('görsel yoksa metni aynen döner', () => {
    expect(formatMessagePreview('merhaba')).toBe('merhaba');
  });
});

describe('embedImageInMessage — gönderim tarafı (regresyon)', () => {
  it('mevcut metne [IMG:url] ekler', () => {
    expect(embedImageInMessage('selam', 'https://api.tarodan.com/api/media/message-attachment/x')).toBe(
      'selam [IMG:https://api.tarodan.com/api/media/message-attachment/x]'
    );
  });

  it('boş metinde yalnız işareti döner', () => {
    expect(embedImageInMessage('', 'dev/messages/x.jpg')).toBe('[IMG:dev/messages/x.jpg]');
  });
});
