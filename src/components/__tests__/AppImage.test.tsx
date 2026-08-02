/**
 * Task 4 (parite P0 #4) — mesaj eki görselleri bearer'sız 401 alıp sessizce
 * placeholder'a düşüyordu (`/api/media/message-attachment/{id}` artık JWT
 * ister). Bu test AppImage'ın opsiyonel `authenticated` yolunu kilitler:
 *   - varsayılan davranış DEĞİŞMEDİ (ürün görselleri hâlâ header'sız) — regresyon.
 *   - `authenticated` açıkken token varsa `Authorization: Bearer <token>` header'ı
 *     `expo-image`'in `source.headers`'ına geçer.
 *   - token yoksa (misafir/oturum düşmüş) header eklenmez — `Bearer null` gibi
 *     geçersiz bir header göndermeyiz.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { AppImage } from '../AppImage';

const mockGetState = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => mockGetState() },
}));

describe('AppImage — authenticated opt-in yükleme (task 4)', () => {
  beforeEach(() => {
    mockGetState.mockReset().mockReturnValue({ token: null });
  });

  it('varsayılan: source.headers hiç GÖNDERİLMEZ (regresyon — ürün görselleri public)', () => {
    mockGetState.mockReturnValue({ token: 'abc123' });
    const { UNSAFE_getByType } = render(
      <AppImage source="https://cdn.example.com/product.jpg" />
    );
    const img = UNSAFE_getByType(Image);
    expect(img.props.source).toEqual({ uri: 'https://cdn.example.com/product.jpg' });
    expect(img.props.source.headers).toBeUndefined();
  });

  it('authenticated=true ve token varsa Authorization header ekler', () => {
    mockGetState.mockReturnValue({ token: 'abc123' });
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
    mockGetState.mockReturnValue({ token: null });
    const { UNSAFE_getByType } = render(
      <AppImage source="https://api.tarodan.com/api/media/message-attachment/xyz" authenticated />
    );
    const img = UNSAFE_getByType(Image);
    expect(img.props.source.headers).toBeUndefined();
  });

  it('authenticated verilmediğinde token sorgulanmaz bile (public görsel yolu dokunulmaz)', () => {
    render(<AppImage source="https://cdn.example.com/product.jpg" />);
    expect(mockGetState).not.toHaveBeenCalled();
  });
});
