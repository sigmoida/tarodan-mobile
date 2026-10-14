import {
  hasPendingImages,
  imagesFromMapped,
  makeCoverImage,
  moveImage,
  patchImage,
  removeImageById,
  rotatedPreviewUri,
  toImageKeys,
  type ListingImage,
} from '../images';
import { gridHeight, moveSlots, slotAtPoint, slotRect } from '../imageGrid';

const img = (id: string): ListingImage => ({
  id,
  cardKey: `card-${id}`,
  detailKey: `detail-${id}`,
  uri: `https://cdn/${id}.webp`,
  status: 'ready',
});
const ids = (list: ListingImage[]) => list.map((i) => i.id);

describe('ilan görsel modeli', () => {
  const list = ['a', 'b', 'c', 'd'].map(img);

  it('moveImage: kalemi taşır; aynı/geçersiz konumda AYNI dizi döner', () => {
    expect(ids(moveImage(list, 0, 2))).toEqual(['b', 'c', 'a', 'd']);
    expect(ids(moveImage(list, 3, 1))).toEqual(['a', 'd', 'b', 'c']);
    expect(moveImage(list, 1, 1)).toBe(list);
    expect(moveImage(list, -1, 2)).toBe(list);
    expect(moveImage(list, 1, 9)).toBe(list);
  });

  it('makeCoverImage = başa al (web makeCover)', () => {
    expect(ids(makeCoverImage(list, 2))).toEqual(['c', 'a', 'b', 'd']);
    expect(makeCoverImage(list, 0)).toBe(list);
  });

  it('removeImageById kimlikten siler; patchImage yalnız eşleşeni günceller', () => {
    expect(ids(removeImageById(list, 'b'))).toEqual(['a', 'c', 'd']);
    const patched = patchImage(list, 'c', { status: 'rotating' });
    expect(patched[2]!.status).toBe('rotating');
    expect(patched[0]).toBe(list[0]);
    expect(hasPendingImages(patched)).toBe(true);
    expect(hasPendingImages(list)).toBe(false);
  });

  it('toImageKeys: payload dizi sırası = ekran sırası (ilk = kapak)', () => {
    expect(toImageKeys(makeCoverImage(list, 3))).toEqual([
      { cardKey: 'card-d', detailKey: 'detail-d' },
      { cardKey: 'card-a', detailKey: 'detail-a' },
      { cardKey: 'card-b', detailKey: 'detail-b' },
      { cardKey: 'card-c', detailKey: 'detail-c' },
    ]);
  });

  it('imagesFromMapped: editMapper çıktısı sırayla, benzersiz kimliklerle', () => {
    const out = imagesFromMapped({
      keys: [
        { cardKey: 'c1', detailKey: 'd1' },
        { cardKey: 'c2', detailKey: 'd2' },
      ],
      uris: ['u1', 'u2'],
    });
    expect(out.map((i) => [i.cardKey, i.uri, i.status])).toEqual([
      ['c1', 'u1', 'ready'],
      ['c2', 'u2', 'ready'],
    ]);
    expect(new Set(out.map((i) => i.id)).size).toBe(2);
  });

  it('rotatedPreviewUri: yeni URL aynen; aynı URL gelirse önbellek kırıcı eklenir', () => {
    expect(rotatedPreviewUri('https://cdn/new.webp', 'https://cdn/old.webp')).toBe('https://cdn/new.webp');
    expect(rotatedPreviewUri('https://cdn/old.webp', 'https://cdn/old.webp')).toMatch(/^https:\/\/cdn\/old\.webp\?v=\d+$/);
    expect(rotatedPreviewUri(undefined, 'https://cdn/x.webp?a=1')).toMatch(/\?a=1&v=\d+$/);
  });
});

describe('görsel ızgarası yerleşimi (3 sütun, kapak 2×2)', () => {
  const W = 300;
  const G = 8;
  const cell = (W - 2 * G) / 3;

  it('yuvalar: kapak sol üst 2×2, 1–2 sağ sütun, 3+ alt satırlar', () => {
    expect(slotRect(0, W, G)).toEqual({ x: 0, y: 0, size: cell * 2 + G });
    expect(slotRect(1, W, G)).toEqual({ x: (cell + G) * 2, y: 0, size: cell });
    expect(slotRect(2, W, G)).toEqual({ x: (cell + G) * 2, y: cell + G, size: cell });
    expect(slotRect(3, W, G)).toEqual({ x: 0, y: (cell + G) * 2, size: cell });
    expect(slotRect(6, W, G)).toEqual({ x: 0, y: (cell + G) * 3, size: cell });
  });

  it('yükseklik: 1–3 görsel iki satır, sonra her 3 görsel bir satır', () => {
    expect(gridHeight(0, W, G)).toBe(0);
    expect(gridHeight(1, W, G)).toBeCloseTo(cell * 2 + G);
    expect(gridHeight(3, W, G)).toBeCloseTo(cell * 2 + G);
    expect(gridHeight(4, W, G)).toBeCloseTo(cell * 3 + G * 2);
    expect(gridHeight(7, W, G)).toBeCloseTo(cell * 4 + G * 3);
  });

  it('slotAtPoint: kapak içindeki nokta (sağ kenara yakın) kapak; dışarıda en yakın yuva', () => {
    expect(slotAtPoint(cell * 2, cell / 2, 5, W, G)).toBe(0);
    expect(slotAtPoint(W - 5, 5, 5, W, G)).toBe(1);
    expect(slotAtPoint(5, (cell + G) * 2 + 5, 5, W, G)).toBe(3);
    // Yalnız 2 görsel varken 3. yuvanın yeri en yakın mevcut yuvaya düşer.
    expect(slotAtPoint(5, (cell + G) * 2 + 5, 2, W, G)).toBe(0);
  });

  it('moveSlots: moveImage ile aynı kaydırma kuralı', () => {
    const slots = { a: 0, b: 1, c: 2, d: 3 };
    expect(moveSlots(slots, 'c', 2, 0)).toEqual({ a: 1, b: 2, c: 0, d: 3 });
    expect(moveSlots(slots, 'a', 0, 3)).toEqual({ a: 3, b: 0, c: 1, d: 2 });
  });
});
