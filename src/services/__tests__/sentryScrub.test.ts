/**
 * Sentry'ye giden olaylardan PII temizliği.
 *
 * `beforeSend` yoktu: axios hatalarında `error.config.data` serileştirilmiş
 * istek gövdesidir ve telefon, adres, e-posta, hatta şifre taşır. Sentry SDK'sı
 * yakaladığı hatanın alanlarını `extra`/`contexts` altına kopyalıyor, yani
 * kayıt sunucusuna kullanıcı verisi gidebiliyordu. `x-request-id` raporlaması
 * (Part 1.7) bu yolu daha da sık kullanır hâle getirdi.
 */
import { scrubBreadcrumb, scrubEvent, sentryUser } from '../sentryScrub';

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

describe('scrubEvent — oturum/ödeme belirteçleri, OTP, 2FA sırları', () => {
  it('oturum ve ödeme belirteçlerini her adla temizler', () => {
    const event = {
      extra: {
        accessToken: 'AT-1',
        refresh_token: 'RT-1',
        pushToken: 'PUSH-1',
        paymentAccessToken: 'PAT-1',
        headers: { 'X-Payment-Capability': 'CAP-1', authorization: 'Bearer AT-2', 'x-request-id': 'r-1' },
        paytr: { paytr_token: 'PT-1', merchant_key: 'MK-1', threeDSHtml: '<form>3DS</form>' },
        card: { card_number: '4111111111111111', cvv: '123', cc_owner: 'AYSE' },
      },
    };
    const cleaned = scrubEvent(event);
    const text = JSON.stringify(cleaned);
    for (const secret of ['AT-1', 'RT-1', 'PUSH-1', 'PAT-1', 'CAP-1', 'AT-2', 'PT-1', 'MK-1', '3DS', '4111', '"123"', 'AYSE']) {
      expect(text).not.toContain(secret);
    }
    expect(cleaned.extra.headers['x-request-id']).toBe('r-1');
  });

  it('OTP kodlarını ve 2FA sırlarını temizler', () => {
    const event = {
      extra: {
        otp: '482913',
        verificationCode: '111222',
        twoFactorCode: '333444',
        setup: { secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/x?secret=JBSW', qrCode: 'data:image/png;base64,AAAA' },
        backupCodes: ['aaaa-bbbb', 'cccc-dddd'],
      },
    };
    const text = JSON.stringify(scrubEvent(event));
    for (const secret of ['482913', '111222', '333444', 'JBSWY3DPEHPK3PXP', 'JBSW', 'AAAA', 'aaaa-bbbb']) {
      expect(text).not.toContain(secret);
    }
  });

  it('metindeki Bearer / JWT / e-posta maskelenir (hata mesajı, breadcrumb mesajı)', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1LTEifQ.c2lnbmF0dXJl';
    const event = {
      exception: { values: [{ type: 'Error', value: `auth failed for a@b.com with Bearer abc.def and ${jwt}` }] },
      message: `token ${jwt}`,
    };
    const text = JSON.stringify(scrubEvent(event));
    expect(text).not.toContain('a@b.com');
    expect(text).not.toContain('abc.def');
    expect(text).not.toContain(jwt);
    expect(text).toContain('auth failed for');
  });
});

describe('scrubEvent — adres sorgusundaki sırlar (http / navigasyon breadcrumb, span)', () => {
  it('http breadcrumb: url sorgusundaki belirteç maskelenir, yol ve masum parametre kalır', () => {
    const crumb = {
      category: 'xhr',
      data: {
        method: 'GET',
        status_code: 200,
        url: 'https://tarodan.com.tr/api/auth/verify-email?token=VERIFY-SECRET&lang=tr',
      },
    };
    const cleaned = scrubBreadcrumb(crumb);
    expect(cleaned.data.url).toBe('https://tarodan.com.tr/api/auth/verify-email?token=[scrubbed]&lang=tr');
    expect(cleaned.data.status_code).toBe(200);
    expect(cleaned.data.method).toBe('GET');
  });

  it('imzalı S3 adresi: X-Amz-* imza/kimlik/oturum belirteci maskelenir', () => {
    const url =
      'https://amzn-tarodan.s3.eu-west-1.amazonaws.com/documents/inv.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
      '&X-Amz-Credential=AKIAEXAMPLE%2F20261017&X-Amz-Security-Token=SESSIONTOKEN&X-Amz-Signature=deadbeefcafe';
    const cleaned = scrubBreadcrumb({ category: 'fetch', data: { url } });
    const text = JSON.stringify(cleaned);
    for (const secret of ['AKIAEXAMPLE', 'SESSIONTOKEN', 'deadbeefcafe']) expect(text).not.toContain(secret);
    expect(cleaned.data.url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
  });

  it('console breadcrumb verisi (rastgele argüman) tümüyle atılır; mesajdaki sır maskelenir', () => {
    const cleaned = scrubBreadcrumb({
      category: 'console',
      message: 'open https://x.example/cb?code=OAUTH-CODE',
      data: { arguments: [{ address: 'Moda Cd. 1' }], logger: 'console' },
    });
    expect(cleaned.data).toBe('[scrubbed]');
    expect(cleaned.message).toBe('open https://x.example/cb?code=[scrubbed]');
  });

  it('olaya iliştirilmiş breadcrumb listesi de aynı kuralla temizlenir (url kalır, sır gider)', () => {
    const event = {
      breadcrumbs: [
        { category: 'xhr', data: { url: '/api/orders?page=2&token=LEAK' } },
        { category: 'console', data: { arguments: ['a@b.com'] } },
      ],
    };
    const cleaned = scrubEvent(event);
    expect(cleaned.breadcrumbs[0].data.url).toBe('/api/orders?page=2&token=[scrubbed]');
    expect(cleaned.breadcrumbs[1].data).toBe('[scrubbed]');
  });

  it('navigasyon breadcrumb: derin bağlantı / rota sorgusundaki sırlar ve ban nedeni maskelenir', () => {
    const crumb = {
      category: 'navigation',
      data: {
        from: '/order-track?orderNumber=ORD-1&email=a%40b.com',
        to: 'tarodan://reset-password?token=RESET-SECRET',
        params: { token: 'RESET-SECRET', orderNumber: 'ORD-1' },
      },
      message: 'Navigated to /banned?reason=Kimli%C4%9Finizi%20do%C4%9Frulay%C4%B1n',
    };
    const cleaned = scrubBreadcrumb(crumb);
    const text = JSON.stringify(cleaned);
    expect(text).not.toContain('RESET-SECRET');
    expect(text).not.toContain('a%40b.com');
    expect(text).not.toContain('Kimli');
    expect(cleaned.data.from).toBe('/order-track?orderNumber=ORD-1&email=[scrubbed]');
    expect(cleaned.data.params.orderNumber).toBe('ORD-1');
  });

  it('adı masum ama değeri opak belirteç olan parametre de maskelenir (UUID ve kısa değer kalır)', () => {
    const uuid = '0f8fad5b-d9cb-469f-a165-70867728950e';
    const cleaned = scrubBreadcrumb({
      category: 'http',
      data: { url: `https://x.example/p?ref=${'A'.repeat(40)}&id=${uuid}&page=2&keyword=hot` },
    });
    expect(cleaned.data.url).toBe(`https://x.example/p?ref=[scrubbed]&id=${uuid}&page=2&keyword=hot`);
  });

  it('işlem (transaction) span açıklamasındaki adres de temizlenir', () => {
    const tx = {
      type: 'transaction',
      spans: [{ op: 'http.client', description: 'GET https://tarodan.com.tr/api/x?otp=123456' }],
    };
    expect(JSON.stringify(scrubEvent(tx))).not.toContain('123456');
  });
});

describe('scrubEvent — işlem (transaction) span/trace verisi yapısı korunur', () => {
  const tx = {
    type: 'transaction',
    contexts: {
      trace: {
        op: 'navigation',
        trace_id: 't-1',
        data: { 'route.name': 'reset-password', 'route.params': { token: 'RESET-SECRET' }, url: '/x?token=T1&page=2' },
      },
    },
    spans: [
      {
        op: 'http.client',
        description: 'GET https://tarodan.com.tr/api/orders?page=2&token=T2',
        data: {
          url: 'https://tarodan.com.tr/api/orders?page=2&token=T2',
          'http.method': 'GET',
          'http.response.status_code': 200,
          'http.query': 'page=2&token=T3',
          accessToken: 'AT-SPAN',
        },
      },
    ],
  };

  it('span.data ve contexts.trace.data metne çevrilmez; içindeki sırlar maskelenir, teşhis alanları kalır', () => {
    const cleaned = scrubEvent(tx);
    const span = cleaned.spans[0]!;
    expect(typeof span.data).toBe('object');
    expect(span.data.url).toBe('https://tarodan.com.tr/api/orders?page=2&token=[scrubbed]');
    expect(span.data['http.method']).toBe('GET');
    expect(span.data['http.response.status_code']).toBe(200);
    expect(span.data['http.query']).toBe('page=2&token=[scrubbed]');
    expect(span.data.accessToken).toBe('[scrubbed]');

    const trace = cleaned.contexts.trace;
    expect(typeof trace.data).toBe('object');
    expect(trace.data['route.name']).toBe('reset-password');
    expect(trace.data['route.params'].token).toBe('[scrubbed]');
    expect(trace.data.url).toBe('/x?token=[scrubbed]&page=2');
    expect(trace.trace_id).toBe('t-1');

    const text = JSON.stringify(cleaned);
    for (const secret of ['RESET-SECRET', 'T1', 'T2', 'T3', 'AT-SPAN']) expect(text).not.toContain(secret);
  });
});

describe('kullanıcı bağlamı: yalnız id', () => {
  it('olaydaki user e-posta / kullanıcı adı / IP taşımaz', () => {
    const cleaned = scrubEvent({
      user: { id: 'u-1', email: 'a@b.com', username: 'ayse', ip_address: '1.2.3.4' },
    });
    expect(cleaned.user).toEqual({ id: 'u-1' });
  });

  it('sentryUser: id yoksa null, varsa yalnız id', () => {
    const withEmail: { id?: string; email?: string } = { id: 'u-1', email: 'a@b.com' };
    const noId: { id?: string; email?: string } = { email: 'a@b.com' };
    expect(sentryUser(withEmail)).toEqual({ id: 'u-1' });
    expect(sentryUser(noId)).toBeNull();
    expect(sentryUser(null)).toBeNull();
  });
});
