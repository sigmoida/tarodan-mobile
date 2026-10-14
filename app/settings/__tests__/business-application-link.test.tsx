/**
 * Kurumsal başvuru ekranına erişim.
 *
 * Brief'teki orijinal test `../index` (app/settings/index.tsx) ve
 * `../../business-pending` import ediyordu — bu dosyalar repoda yok
 * (bkz. repo-notes.md). Gerçek konumlar:
 *   - Menü girişi: app/(tabs)/_lib/profileMenu.ts → buildProfileMenuGroups (Hesap grubu)
 *     (app/(tabs)/_components/ProfileSections.tsx içinde render edilir)
 *   - Durum ekranı: app/business-pending.tsx
 *   - Kilit: src/components/BusinessMembershipGuard.tsx
 *
 * Menü girişi için `useProfile`'ın tüm bağımlılıklarını (React Query, çoklu
 * store) mock'lamak yerine `buildProfileMenuGroups`'ı doğrudan içe aktarıp
 * varlığını + hedef rotasını doğrulayan bir birim testi yazıldı (brief'in
 * kabul ettiği alternatif). business-pending ve guard için gerçek davranış
 * testleri yazıldı.
 *
 * NOT: jest.mock çağrıları dosya başına hoist edilir — aynı modül için
 * describe içinde farklı mock factory'ler yazmak sessizce çakışır. Bu yüzden
 * tek bir `expo-router` / authStore mock'u burada, dosya seviyesinde,
 * mutable state ile paylaşılıyor.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { buildProfileMenuGroups } from '../../(tabs)/_lib/profileMenu';
import { schemaT } from '@/test-utils';

// Menü bir FABRİKA (etiketler çeviriden gelir). Bu test dilden bağımsız alanları
// (`testID`, `to`) ve kurumsal hesap kapısını sınıyor, o yüzden gerçek katalogla kurmak yeter.
const menuItems = (isBusiness: boolean) =>
  buildProfileMenuGroups(schemaT, {
    isBusiness,
    showMembership: false,
    isBusinessTier: false,
  }).flatMap((g) => g.items);

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockPathname = '/settings/business-application';

jest.mock('expo-router', () => ({
  router: {
    push: (r: string) => mockPush(r),
    replace: (r: string) => mockReplace(r),
    back: jest.fn(),
    canGoBack: () => true,
  },
  usePathname: () => mockPathname,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

let mockUser: Record<string, unknown> = {};
const mockLogout = jest.fn();

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: true, user: mockUser, logout: mockLogout });
    return sel ? sel(state) : state;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/settings/business-application';
});

describe('profil menüsü — Kurumsal Başvuru girişi', () => {
  it('kurumsal hesapta Hesap grubunda doğru rotayla yer alır', () => {
    const entry = menuItems(true).find((q) => q.testID === 'settings-business-application');
    expect(entry).toBeDefined();
    expect(entry?.to).toBe('/settings/business-application');
    expect(entry?.label).toBe('Kurumsal Başvuru');
  });

  it('bireysel hesapta görünmez', () => {
    expect(menuItems(false).find((q) => q.testID === 'settings-business-application')).toBeUndefined();
  });
});

describe('business-pending — başvuruya devam', () => {
  it('devam butonuna basınca /settings/business-application açılır', async () => {
    mockUser = { companyName: 'Test AŞ', email: 'test@example.com' };
    const BusinessPendingScreen = require('../../business-pending').default;
    render(<BusinessPendingScreen />);
    await waitFor(() => expect(screen.getByTestId('business-pending-continue')).toBeTruthy());
    fireEvent.press(screen.getByTestId('business-pending-continue'));
    expect(mockPush).toHaveBeenCalledWith('/settings/business-application');
  });
});

describe('business-rejected — başvuruyu düzelt', () => {
  it('"Başvurumu Düzelt" butonuna basınca /settings/business-application açılır', async () => {
    mockUser = { companyName: 'Test AŞ', email: 'test@example.com' };
    const BusinessRejectedScreen = require('../../business-rejected').default;
    render(<BusinessRejectedScreen />);
    await waitFor(() => expect(screen.getByTestId('business-rejected-continue')).toBeTruthy());
    fireEvent.press(screen.getByTestId('business-rejected-continue'));
    expect(mockPush).toHaveBeenCalledWith('/settings/business-application');
  });
});

describe('BusinessMembershipGuard — pending kullanıcı business-application yolunda kilitlenmemeli', () => {
  it('/settings/business-application yolunda router.replace ÇAĞRILMAZ', async () => {
    mockUser = { companyName: 'Test AŞ', taxId: '1234567890', businessStatus: 'pending' };
    mockPathname = '/settings/business-application';
    const BusinessMembershipGuard = require('../../../src/components/BusinessMembershipGuard').default;
    render(<BusinessMembershipGuard />);
    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  });

  it('/some-other-path yolunda hâlâ /business-pending\'e geri atılır (regresyon)', async () => {
    mockUser = { companyName: 'Test AŞ', taxId: '1234567890', businessStatus: 'pending' };
    mockPathname = '/some-other-path';
    const BusinessMembershipGuard = require('../../../src/components/BusinessMembershipGuard').default;
    render(<BusinessMembershipGuard />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/business-pending'));
  });
});
