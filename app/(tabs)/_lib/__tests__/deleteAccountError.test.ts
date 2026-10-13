/** B-2.6 · Hesap silme reddi: engel listesi gösterilir, aktif ilanda yol verilir. */
import { describeDeleteAccountError } from '../deleteAccountError';

const blocked = (details: Record<string, number>, errors: string[]) => ({
  response: {
    status: 400,
    data: {
      message: 'Hesabınızı silmek için aşağıdaki işlemleri tamamlamanız gerekmektedir:',
      i18nKey: 'server.user.deleteAccountBlocked',
      errors,
      details,
    },
  },
});

describe('describeDeleteAccountError', () => {
  it('aktif ilan engeli: liste + "ilanlarımı yönet" yolu', () => {
    const r = describeDeleteAccountError(
      blocked({ activeProducts: 2, pendingOrders: 1 }, ['2 aktif ilanınız var.', '1 bekleyen sipariş.']),
      'fallback',
    );
    expect(r.hasActiveListings).toBe(true);
    expect(r.blocked).toBe(true);
    expect(r.message).toBe(
      'Hesabınızı silmek için aşağıdaki işlemleri tamamlamanız gerekmektedir:\n• 2 aktif ilanınız var.\n• 1 bekleyen sipariş.',
    );
  });

  it('ilan dışı engelde yol düğmesi yok', () => {
    const r = describeDeleteAccountError(blocked({ activeProducts: 0, openRefunds: 1 }, ['1 açık iade.']), 'f');
    expect(r.hasActiveListings).toBe(false);
    expect(r.blocked).toBe(true);
  });

  it('ağ hatası: fallback metin, engel yok', () => {
    expect(describeDeleteAccountError(new Error('Network'), 'Hesap silinemedi')).toEqual({
      message: 'Hesap silinemedi',
      blocked: false,
      hasActiveListings: false,
    });
  });
});
