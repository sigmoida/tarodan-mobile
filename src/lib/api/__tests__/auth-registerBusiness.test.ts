/**
 * `authApi.registerBusiness` hangi istemciyle gidiyor?
 *
 * Bu uç **public bir ön başvuru** — oturum olmamalı. `api` (interceptor'lı istemci)
 * bayat token'lı bir cihazda iki şekilde zarar veriyordu:
 *  - 401 → refresh başarısız → `handleAuthFailure()` logout + login'e yönlendirme:
 *    başvuru sessizce kaybolur, form state gider.
 *  - 401 → refresh başarılı → `api(originalRequest)`: non-idempotent POST **replay**
 *    edilir (mükerrer başvuru + 5/dk kotasından ikinci hak yanar).
 * `guestApi` hiçbir interceptor'a bağlı değil.
 */
jest.mock('../client', () => ({
  api: { post: jest.fn(() => Promise.resolve({ data: {} })) },
  guestApi: { post: jest.fn(() => Promise.resolve({ data: {} })) },
}));

import { api, guestApi } from '../client';
import { authApi } from '../auth';

const payload = {
  authorizedFullName: 'Ayşe Test Yılmaz',
  companyLegalName: 'Test Otomotiv Sanayi ve Ticaret Limited Şirketi',
  companyTitle: 'Test Otomotiv Ltd. Şti.',
  companyAddress: 'Örnek Mahallesi Test Caddesi No:12 Kadıköy İstanbul',
  companyEmail: 'basvuru@testotomotiv.com',
  phone: '+905321234567',
};

beforeEach(() => jest.clearAllMocks());

describe('authApi.registerBusiness — transport', () => {
  it('oturum eklemeyen `guestApi` ile gider (token interceptor\'ına bağlanmaz)', async () => {
    await authApi.registerBusiness(payload);

    expect(guestApi.post).toHaveBeenCalledTimes(1);
    expect((guestApi.post as jest.Mock).mock.calls[0][0]).toBe('/auth/register/business');
    expect((guestApi.post as jest.Mock).mock.calls[0][1]).toEqual(payload);
    expect(api.post).not.toHaveBeenCalled();
  });
});
