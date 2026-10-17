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
// API kökü test ortamında sabit: mutlak `[IMG:]` hedefi yalnız bu origin'deki mesaj eki ucu olabilir.
jest.mock('@/lib/api/baseUrl', () => ({ resolveApiBaseUrl: () => 'https://api.tarodan.com/api' }));

import { parseMessageContent, formatMessagePreview, embedImageInMessage } from '../contentFilter';

const OWN = 'https://api.tarodan.com/api/media/message-attachment/a1';

describe('parseMessageContent — [IMG:] ayrıştırma (task 4)', () => {
  it('kendi mesaj eki ucumuzu (mutlak URL) yakalar', () => {
    const { text, images } = parseMessageContent(`bak [IMG:${OWN}]`);
    expect(images).toEqual([OWN]);
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

  it('boş işaret `[IMG:]` eşleşmez — ham metin olarak kalır', () => {
    expect(parseMessageContent('[IMG:]')).toEqual({ text: '[IMG:]', images: [] });
  });

  it('yalnız boşluk içeren `[IMG: ]` eşleşmez', () => {
    expect(parseMessageContent('[IMG: ]')).toEqual({ text: '[IMG: ]', images: [] });
  });

  it('kapanmamış işaret `[IMG:x.jpg` eşleşmez — gövde yutulmaz', () => {
    expect(parseMessageContent('merhaba [IMG:x.jpg')).toEqual({
      text: 'merhaba [IMG:x.jpg',
      images: [],
    });
  });
});

/**
 * I1 (düzeltme turu) — genişletilmiş regex şemasız DEĞERLERİ kabul ederken
 * lokal/tehlikeli şemaları da yakalar hâle gelmişti. Mesaj gövdesi güvenilmez
 * girdi: `detectViolations` yalnız KULLANICININ YAZDIĞI metne uygulanıyor
 * (`useMessageThread`), karşı taraf gövdeye elle `[IMG:file:///…]` yazabilir ve
 * `resolveImageUrl` lokal şemaları olduğu gibi `expo-image`'e geçiriyor.
 * Beyaz liste mesaj AYRIŞTIRMA SINIRINDA uygulanır.
 */
describe('parseMessageContent — [IMG:] şema beyaz listesi (I1)', () => {
  const blocked = [
    ['file (yerel dosya okuma)', 'file:///etc/passwd'],
    ['data (gömülü HTML/script)', 'data:text/html,<script>alert(1)</script>'],
    ['javascript', 'javascript:alert(1)'],
    ['ph (alıcının kendi galerisi — UI spoof)', 'ph://ASSET-ID/L0/001'],
    ['assets-library', 'assets-library://asset/asset.JPG'],
    ['content (Android sağlayıcı)', 'content://media/external/images/1'],
    ['blob', 'blob:abc-123'],
  ] as const;

  it.each(blocked)('%s şeması reddedilir — images boş kalır', (_label, target) => {
    const { images } = parseMessageContent(`[IMG:${target}]`);
    expect(images).toEqual([]);
  });

  it('reddedilen işaret metinde de görünmez (ham `[IMG:file:…]` sızmaz)', () => {
    const { text, images } = parseMessageContent('bak [IMG:file:///etc/passwd] gördün mü');
    expect(images).toEqual([]);
    // İşaret silinir (geçerli hedeflerdeki davranışın aynısı); geriye iki
    // boşluk kalır — mevcut davranış, kayıt altına alınıyor.
    expect(text).toBe('bak  gördün mü');
  });

  it('dizin çıkışı içeren çıplak key reddedilir', () => {
    expect(parseMessageContent('[IMG:../../secret]').images).toEqual([]);
    expect(parseMessageContent('[IMG:dev/../../secret.jpg]').images).toEqual([]);
  });

  it('meşru hedefler etkilenmez: kendi mesaj eki ucu, `/` relatif, çıplak key', () => {
    expect(parseMessageContent(`[IMG:${OWN}]`).images).toEqual([OWN]);
    expect(parseMessageContent('[IMG:/photos/x.jpg]').images).toEqual(['/photos/x.jpg']);
    expect(parseMessageContent('[IMG:dev/messages/x.jpg]').images).toEqual([
      'dev/messages/x.jpg',
    ]);
  });

  it('karışık mesajda yalnız geçerli hedef render edilir', () => {
    const { images } = parseMessageContent(`[IMG:file:///etc/passwd] [IMG:${OWN}]`);
    expect(images).toEqual([OWN]);
  });
});

/**
 * Token sızıntısı (HIGH) — mesaj eki `authenticated` render ediliyor; bearer'ı
 * YALNIZ `AppImage` + `isApiMessageAttachmentUrl` (sıkı origin+yol kontrolü) belirler.
 * Ayrıştırıcı ise eski mesajlardaki S3/CDN https görsellerini göstermeye devam eder
 * (bearer'sız yüklenir); userinfo / ters bölü / dizin çıkışı gibi numaralar atılır.
 */
describe('parseMessageContent — mutlak http(s) hedefler', () => {
  const accepted = [
    ['eski mesajdaki S3/CDN https görseli', 'https://cdn.x.com/a.jpg'],
    ['presigned S3 (sorgulu)', 'https://bucket.s3.eu-central-1.amazonaws.com/dev/messages/a.jpg?X-Amz-Signature=abc&X-Amz-Expires=60'],
    ['yabancı host mesaj eki yolu (bearer yine gitmez)', 'https://evil.example/api/media/message-attachment/a1'],
    ['dev: sunucunun döndürdüğü localhost', 'http://localhost:3000/api/media/message-attachment/a1'],
    ['Türkçe karakterli yüzde kodlu yol', 'https://cdn.x.com/dev/%C3%A7ocuk%20resmi.jpg'],
  ] as const;

  it.each(accepted)('%s kabul edilir', (_label, target) => {
    expect(parseMessageContent(`[IMG:${target}]`).images).toEqual([target]);
  });

  const rejected = [
    ['userinfo ile host kandırma', 'https://api.tarodan.com@evil.example/api/media/message-attachment/a1'],
    ['dizin çıkışı', 'https://api.tarodan.com/api/media/message-attachment/../../users/me'],
    ['yüzde kodlu çıkış', 'https://api.tarodan.com/api/media/message-attachment/%2e%2e%2fx'],
    ['ters bölü', 'https://api.tarodan.com\\@evil.example/api/media/message-attachment/a1'],
    ['bozuk yüzde kodlama', 'https://cdn.x.com/a%E0%A4%A.jpg'],
    ['hostsuz', 'https:///a.jpg'],
  ] as const;

  it.each(rejected)('%s reddedilir', (_label, target) => {
    expect(parseMessageContent(`[IMG:${target}]`).images).toEqual([]);
  });

  it('host ve şema büyük/küçük harf duyarsız eşleşir', () => {
    const upper = 'HTTPS://API.TARODAN.COM/api/media/message-attachment/a1';
    expect(parseMessageContent(`[IMG:${upper}]`).images).toEqual([upper]);
  });

  it('eski https görseli önizlemede 📷 Fotoğraf basar', () => {
    expect(formatMessagePreview('[IMG:https://cdn.x.com/a.jpg]')).toBe('📷 Fotoğraf');
  });

  it('reddedilen işaret metinde görünmez ve önizlemede 📷 basmaz', () => {
    expect(parseMessageContent('bak [IMG:https://x@evil.example/x.jpg]').text).toBe('bak');
    expect(formatMessagePreview('[IMG:https://x@evil.example/x.jpg]')).toBe('');
  });

  it('formatMessagePreview reddedilen hedef için 📷 Fotoğraf BASMAZ', () => {
    expect(formatMessagePreview('[IMG:file:///etc/passwd]')).toBe('');
    expect(formatMessagePreview('selam [IMG:javascript:alert(1)]')).toBe('selam');
  });
});

describe('formatMessagePreview — hem mutlak URL hem çıplak key için 📷 Fotoğraf basar (task 4)', () => {
  it('mutlak URL', () => {
    expect(formatMessagePreview(`[IMG:${OWN}]`)).toBe('📷 Fotoğraf');
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

  it('sunucunun döndürdüğü URL istemci API tabanından farklı origin olsa da (dev localhost) fırlatmaz', () => {
    expect(embedImageInMessage('', 'http://localhost:3000/api/media/message-attachment/x')).toBe(
      '[IMG:http://localhost:3000/api/media/message-attachment/x]'
    );
    expect(embedImageInMessage('', 'https://cdn.x.com/a.jpg')).toBe('[IMG:https://cdn.x.com/a.jpg]');
  });

  it('geçersiz hedefle işaret KURMAZ (`]`, boşluk, yerel şema, userinfo, dizin çıkışı)', () => {
    expect(() => embedImageInMessage('', 'dev/x].jpg')).toThrow();
    expect(() => embedImageInMessage('', 'dev/x y.jpg')).toThrow();
    expect(() => embedImageInMessage('', 'file:///etc/passwd')).toThrow();
    expect(() => embedImageInMessage('', 'https://a@evil.example/x.jpg')).toThrow();
    expect(() => embedImageInMessage('', 'https://cdn.x.com/../x.jpg')).toThrow();
  });
});
