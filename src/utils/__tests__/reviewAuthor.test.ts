/**
 * Yorumlar bir UGC yüzeyi (Apple 1.2): yorumu yazanın profiline gidilebilmeli —
 * şikayet ve engelleme orada (⋮ menüsü). İki DTO şekli (2026-09-29 prod ölçümü):
 * ürün yorumu `userId`/`user.id`, satıcı yorumu `giverId`/`giver.id`.
 */
import { reviewAuthorId } from '../reviewAuthor';

describe('reviewAuthorId', () => {
  it('ürün yorumu', () => {
    expect(reviewAuthorId({ userId: 'u1', user: { id: 'u1' } })).toBe('u1');
    expect(reviewAuthorId({ userId: 'u2' })).toBe('u2');
  });
  it('satıcı yorumu', () => {
    expect(reviewAuthorId({ giverId: 'g1', giver: { id: 'g1' } })).toBe('g1');
    expect(reviewAuthorId({ giver: { id: 'g2' } })).toBe('g2');
  });
  it('kimlik yoksa null', () => {
    expect(reviewAuthorId({ userName: 'x' })).toBeNull();
    expect(reviewAuthorId(null)).toBeNull();
  });
});
