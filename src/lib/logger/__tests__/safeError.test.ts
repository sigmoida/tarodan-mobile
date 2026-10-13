/**
 * Gizlilik: hata günlüğü AxiosError'un Authorization başlığını, istek/yanıt gövdesini
 * ve sorgu dizesini taşımaz; yalnız mesaj, durum, kod, yöntem ve URL yolu.
 */
import { AxiosError, AxiosHeaders } from 'axios';
import { safeError, safeUrlPath } from '../safe-error';

const SECRET = 'Bearer eyJ-super-secret';

function axiosErr(status = 401, url = 'https://api.tarodan.com/users/me?token=qs-secret#frag') {
  const config = {
    url,
    method: 'get',
    headers: new AxiosHeaders({ Authorization: SECRET }),
    data: JSON.stringify({ password: 'body-secret' }),
  };
  const response = { status, statusText: 'x', headers: {}, config, data: { accessToken: 'resp-secret' } };
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config as never, {}, response as never);
}

describe('safeError', () => {
  it('AxiosError: mesaj + status + kod + yöntem + yalnız URL yolu', () => {
    expect(safeError(axiosErr())).toEqual({
      name: 'AxiosError',
      message: 'Request failed with status code 401',
      status: 401,
      code: 'ERR_BAD_REQUEST',
      method: 'GET',
      path: '/users/me',
    });
  });

  it('serileştirilmiş çıktıda header, gövde ve sorgu dizesi yok', () => {
    const dump = JSON.stringify(safeError(axiosErr()));
    for (const leak of ['super-secret', 'Authorization', 'body-secret', 'resp-secret', 'qs-secret', 'api.tarodan.com']) {
      expect(dump).not.toContain(leak);
    }
  });

  it('düz Error ve Error olmayan değerler', () => {
    expect(safeError(new Error('boom'))).toEqual({ message: 'boom' });
    expect(safeError('düz metin')).toEqual({ message: 'düz metin' });
    expect(safeError(undefined)).toEqual({ message: 'Unknown error' });
    expect(safeError({})).toEqual({ message: 'Unknown error' });
  });

  it('uzun mesaj kısaltılır', () => {
    expect(safeError(new Error('x'.repeat(500))).message.length).toBeLessThan(250);
  });

  it('yanıtsız ağ hatasında status yok', () => {
    const e = new AxiosError('Network Error', 'ERR_NETWORK', { url: '/orders', method: 'post', headers: new AxiosHeaders() } as never);
    expect(safeError(e)).toMatchObject({ message: 'Network Error', code: 'ERR_NETWORK', method: 'POST', path: '/orders' });
    expect(safeError(e).status).toBeUndefined();
  });
});

describe('safeUrlPath', () => {
  it('origin, sorgu ve parça atılır; uzun opak segment maskelenir', () => {
    expect(safeUrlPath('https://a.b/c/d?x=1')).toBe('/c/d');
    expect(safeUrlPath('/auth/reset/abcdefghijklmnopqrstuvwxyz0123456789?x=1')).toBe('/auth/reset/:redacted');
    expect(safeUrlPath('/orders/123')).toBe('/orders/123');
    expect(safeUrlPath(undefined)).toBeUndefined();
  });
});
