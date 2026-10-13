/**
 * Sentry'ye giden olaylardan PII temizliği.
 *
 * `beforeSend` yoktu: axios hatalarında `error.config.data` serileştirilmiş
 * istek gövdesidir ve telefon, adres, e-posta, hatta şifre taşır. Sentry SDK'sı
 * yakaladığı hatanın alanlarını `extra`/`contexts` altına kopyalıyor, yani
 * kayıt sunucusuna kullanıcı verisi gidebiliyordu. `x-request-id` raporlaması
 * (Part 1.7) bu yolu daha da sık kullanır hâle getirdi.
 */
import { scrubEvent } from '../sentryScrub';

describe('scrubEvent', () => {
  it('yasal kimlik alanlarını (B-2.4) her derinlikte temizler, teşhis alanlarını bırakır', () => {
    const event = {
      extra: {
        response: {
          status: 409,
          url: '/legal-identity/me',
          data: undefined,
          identity: {
            nationalId: '10000000146',
            suggestedNationalId: '10000000146',
            nationalIdMasked: '•••••••••46',
            legalFirstName: 'Ayşe Nur',
            legalLastName: 'Yılmaz',
            missing: ['nationalId'],
          },
        },
        bank: { tcKimlikNo: '10000000146', TCKimlikNo: '10000000146' },
        i18nKey: 'server.identity.locked',
      },
    };

    const cleaned = scrubEvent(event as any) as any;
    const text = JSON.stringify(cleaned);

    for (const secret of ['10000000146', '•••••••••46', 'Ayşe Nur', 'Yılmaz']) {
      expect(text).not.toContain(secret);
    }
    expect(cleaned.extra.response.identity.nationalId).toBe('[scrubbed]');
    expect(cleaned.extra.bank.TCKimlikNo).toBe('[scrubbed]');
    // Teşhis için gerekenler kalır (alan ADI listede değer değil).
    expect(cleaned.extra.response.identity.missing).toEqual(['nationalId']);
    expect(cleaned.extra.response.url).toBe('/legal-identity/me');
    expect(cleaned.extra.i18nKey).toBe('server.identity.locked');
  });

  it('removes a serialized request body from the event', () => {
    const event = {
      extra: {
        config: { data: '{"phone":"+905321234567","password":"hunter2"}', url: '/auth/login' },
      },
    };

    const cleaned = JSON.stringify(scrubEvent(event as any));

    expect(cleaned).not.toContain('905321234567');
    expect(cleaned).not.toContain('hunter2');
  });

  it('removes authorization headers', () => {
    const event = {
      request: { headers: { Authorization: 'Bearer secret-token', 'x-request-id': 'r-1' } },
    };

    const cleaned = scrubEvent(event as any) as any;

    expect(JSON.stringify(cleaned)).not.toContain('secret-token');
    // Teşhis için gereken alan KALIR — temizlik körlük yaratmamalı.
    expect(cleaned.request.headers['x-request-id']).toBe('r-1');
  });

  it('redacts personal fields wherever they are nested', () => {
    const event = {
      extra: {
        payload: { user: { email: 'a@b.com', phone: '+905321234567', iban: 'TR12' } },
      },
    };

    const cleaned = JSON.stringify(scrubEvent(event as any));

    expect(cleaned).not.toContain('a@b.com');
    expect(cleaned).not.toContain('905321234567');
    expect(cleaned).not.toContain('TR12');
  });

  it('keeps the diagnostic fields the report exists for', () => {
    const event = {
      extra: { requestId: 'req-9', status: 401, url: '/orders', i18nKey: 'server.auth.x' },
    };

    const cleaned = scrubEvent(event as any) as any;

    expect(cleaned.extra).toEqual({
      requestId: 'req-9',
      status: 401,
      url: '/orders',
      i18nKey: 'server.auth.x',
    });
  });

  it('survives a null event and cyclic structures', () => {
    expect(scrubEvent(null as any)).toBeNull();

    const cyclic: any = { extra: {} };
    cyclic.extra.self = cyclic;
    expect(() => scrubEvent(cyclic)).not.toThrow();
  });
});
