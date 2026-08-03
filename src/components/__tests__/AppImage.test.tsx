/**
 * Task 4 (parite P0 #4) — mesaj eki görselleri bearer'sız 401 alıp sessizce
 * placeholder'a düşüyordu (`/api/media/message-attachment/{id}` artık JWT
 * ister). Bu test AppImage'ın opsiyonel `authenticated` yolunu kilitler:
 *   - varsayılan davranış DEĞİŞMEDİ (ürün görselleri hâlâ header'sız) — regresyon.
 *   - `authenticated` açıkken token varsa `Authorization: Bearer <token>` header'ı
 *     `expo-image`'in `source.headers`'ına geçer.
 *   - token yoksa (misafir/oturum düşmüş) header eklenmez — `Bearer null` gibi
 *     geçersiz bir header göndermeyiz.
 *
 * Düzeltme turu (C2): token store'dan `getState()` ile TEK SEFER okunuyordu.
 * `React.memo` + sığ-eşit prop'lar + sabit `key` yüzünden token sonradan
 * geldiğinde (push/deep-link ile thread'e girip `loadToken()` bitmeden render
 * olmak) ya da sessiz refresh'te değiştiğinde komponent bir daha ASLA
 * denemiyordu → görsel kalıcı kırık. Artık store'a abone; aşağıdaki iki test
 * tam olarak o senaryoyu sürüyor (gerçek zustand store ile, çünkü hata mock'ın
 * değil aboneliğin yokluğundaydı).
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { AppImage } from '../AppImage';

jest.mock('@/stores/authStore', () => {
  const { create } = require('zustand');
  return { useAuthStore: create(() => ({ token: null })) };
});

import { useAuthStore } from '@/stores/authStore';

const setToken = (token: string | null) =>
  act(() => {
    (useAuthStore as any).setState({ token });
  });

describe('AppImage — authenticated opt-in yükleme (task 4)', () => {
  beforeEach(() => {
    (useAuthStore as any).setState({ token: null });
  });

  it('varsayılan: token VARKEN bile source.headers konulmaz (regresyon — ürün görselleri public)', () => {
    (useAuthStore as any).setState({ token: 'abc123' });
    const { UNSAFE_getByType } = render(
      <AppImage source="https://cdn.example.com/product.jpg" />
    );
    const img = UNSAFE_getByType(Image);
    expect(img.props.source).toEqual({ uri: 'https://cdn.example.com/product.jpg' });
    expect(img.props.source.headers).toBeUndefined();
  });

  it('authenticated=true ve token varsa Authorization header ekler', () => {
    (useAuthStore as any).setState({ token: 'abc123' });
    const { UNSAFE_getByType } = render(
      <AppImage
        source="https://api.tarodan.com/api/media/message-attachment/xyz"
        authenticated
      />
    );
    const img = UNSAFE_getByType(Image);
    expect(img.props.source).toEqual({
      uri: 'https://api.tarodan.com/api/media/message-attachment/xyz',
      headers: { Authorization: 'Bearer abc123' },
    });
  });

  it('authenticated=true ama token yoksa (misafir/oturum düşmüş) headers eklenmez', () => {
    const { UNSAFE_getByType } = render(
      <AppImage source="https://api.tarodan.com/api/media/message-attachment/xyz" authenticated />
    );
    const img = UNSAFE_getByType(Image);
    expect(img.props.source.headers).toBeUndefined();
  });

  it('C2: token SONRADAN gelirse (loadToken bitince) görsel yeni header ile tekrar dener', () => {
    // Mount anında token yok — push/deep-link ile thread'e girme senaryosu.
    const { UNSAFE_getByType } = render(
      <AppImage source="https://api.tarodan.com/api/media/message-attachment/xyz" authenticated />
    );
    expect(UNSAFE_getByType(Image).props.source.headers).toBeUndefined();

    setToken('late-token');

    expect(UNSAFE_getByType(Image).props.source).toEqual({
      uri: 'https://api.tarodan.com/api/media/message-attachment/xyz',
      headers: { Authorization: 'Bearer late-token' },
    });
  });

  it('C1: sessiz refresh token’ı değiştirince header BAYAT kalmaz', () => {
    (useAuthStore as any).setState({ token: 'expired-token' });
    const { UNSAFE_getByType } = render(
      <AppImage source="https://api.tarodan.com/api/media/message-attachment/xyz" authenticated />
    );
    expect(UNSAFE_getByType(Image).props.source.headers).toEqual({
      Authorization: 'Bearer expired-token',
    });

    setToken('refreshed-token');

    expect(UNSAFE_getByType(Image).props.source.headers).toEqual({
      Authorization: 'Bearer refreshed-token',
    });
  });

  it('token değişse bile public (authenticated verilmemiş) görsel header ALMAZ', () => {
    const { UNSAFE_getByType } = render(
      <AppImage source="https://cdn.example.com/product.jpg" />
    );
    setToken('abc123');
    expect(UNSAFE_getByType(Image).props.source).toEqual({
      uri: 'https://cdn.example.com/product.jpg',
    });
  });
});

/**
 * I2 — authenticated bir yükleme başarısız olduğunda sessizce gri kutuya
 * düşmesin. Log YALNIZ `__DEV__` altında ve token/URL/query İÇERMEZ.
 */
describe('AppImage — başarısız bearer yüklemesi görünür olur (I2)', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    warn.mockClear();
    (useAuthStore as any).setState({ token: null });
  });

  afterAll(() => warn.mockRestore());

  it('authenticated yükleme hatası DEV altında uyarı basar (token/URL sızdırmadan)', () => {
    (useAuthStore as any).setState({ token: 'secret-token-value' });
    const { UNSAFE_getByType } = render(
      <AppImage source="https://api.tarodan.com/api/media/message-attachment/xyz?sig=SECRET" authenticated />
    );

    act(() => UNSAFE_getByType(Image).props.onError());

    expect(warn).toHaveBeenCalledTimes(1);
    const logged = String(warn.mock.calls[0][0]);
    expect(logged).toContain('hasToken=true');
    expect(logged).not.toContain('secret-token-value');
    expect(logged).not.toContain('message-attachment');
    expect(logged).not.toContain('SECRET');
  });

  it('token yokken hasToken=false — C2 (token hiç gelmedi) ile C1 (bayat) ayrılabilsin', () => {
    const { UNSAFE_getByType } = render(
      <AppImage source="https://api.tarodan.com/api/media/message-attachment/xyz" authenticated />
    );

    act(() => UNSAFE_getByType(Image).props.onError());

    expect(String(warn.mock.calls[0][0])).toContain('hasToken=false');
  });

  it('public görselin hatası log basmaz (gürültü yok) ama onError yine çağrılır', () => {
    const onError = jest.fn();
    const { UNSAFE_getByType } = render(
      <AppImage source="https://cdn.example.com/product.jpg" onError={onError} />
    );

    act(() => UNSAFE_getByType(Image).props.onError());

    expect(warn).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
