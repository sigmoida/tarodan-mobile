/**
 * D-2.7: dijital satış kapısı İKİ platformda da kapalı ve Android iOS gibi
 * davranır. Diğer testler `CAN_BUY_DIGITAL`'ı mock'lar; burada GERÇEK sabit,
 * `Platform.OS` değiştirilerek her iki platform için yüklenir.
 *
 * Kapsam: sabit, UpgradeCta, useFeatureAccess (savunma katmanı), sunucu
 * "üyeliği yükseltin" hata metninin nötrleştirilmesi, limitAlert.
 */
import React from 'react';
import { Platform, Text } from 'react-native';

jest.mock('@/ui', () => ({ appAlert: jest.fn() }));

let mockAuth: any;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => (sel ? sel(mockAuth) : mockAuth),
}));

const setOS = (os: 'ios' | 'android') =>
  Object.defineProperty(Platform, 'OS', { value: os, writable: true, configurable: true });

afterEach(() => setOS('ios'));

describe.each(['ios', 'android'] as const)('dijital satış kapısı (%s)', (os) => {
  const load = <T,>(fn: () => T): T => {
    let out!: T;
    jest.isolateModules(() => {
      setOS(os);
      out = fn();
    });
    return out;
  };

  it('CAN_BUY_DIGITAL kapalı', () => {
    expect(load(() => require('@/lib/purchases')).CAN_BUY_DIGITAL).toBe(false);
  });

  it('UpgradeCta hiçbir şey çizmez', () => {
    const { render } = require('@testing-library/react-native');
    const UpgradeCta = load(() => require('@/components/UpgradeCta').default);
    const { queryByText } = render(
      <UpgradeCta>
        <Text>Premium'a geç</Text>
      </UpgradeCta>,
    );
    expect(queryByText("Premium'a geç")).toBeNull();
  });

  it('useFeatureAccess: yetkisiz üyeye koleksiyon girişi yok (takas girişi kapıya bağlı değil), misafire var', () => {
    const { renderHook } = require('@testing-library/react-native');
    const useFeatureAccess = load(() => require('@/hooks/useFeatureAccess').useFeatureAccess);
    mockAuth = {
      isAuthenticated: true,
      user: { membershipTier: 'free' },
      limits: { canTrade: false, canCreateCollections: false },
    };
    const member = renderHook(() => useFeatureAccess()).result.current;
    expect(member.canTrade).toBe(false);
    expect(member.showCollectionEntry).toBe(false);

    mockAuth = { isAuthenticated: false, user: null, limits: null };
    const guest = renderHook(() => useFeatureAccess()).result.current;
    expect(guest).not.toHaveProperty('showTradeEntry');
    expect(guest.showCollectionEntry).toBe(true);
  });

  it('sunucunun "üyeliğinizi yükseltin" metni nötrleşir', () => {
    const { CAN_BUY_DIGITAL } = load(() => require('@/lib/purchases'));
    const { neutralizeUpsellError } = load(() => require('@/lib/api/iosNeutralErrors'));
    const t = (k: string) => `T(${k})`;

    const keyed: any = {
      response: { data: { i18nKey: 'server.product.tradeRequiresPremium', message: 'Üyeliğinizi yükseltin' } },
    };
    neutralizeUpsellError(keyed, t, CAN_BUY_DIGITAL);
    expect(keyed.response.data.message).toBe('T(membership.featureUnavailableOnAccount)');

    const plain: any = { response: { data: { message: 'Temel üyeliğinizi yenileyin' } } };
    neutralizeUpsellError(plain, t, CAN_BUY_DIGITAL);
    expect(plain.response.data.message).toBe('T(membership.featureUnavailableOnAccount)');
  });

  it('limitAlert: yükseltme düğmesi yok', () => {
    const { limitAlert } = load(() => require('@/lib/purchases'));
    const { appAlert } = require('@/ui');
    (appAlert as jest.Mock).mockClear();
    const onUpgrade = jest.fn();
    limitAlert({ title: 't', message: 'm', cancelLabel: 'İptal', upgradeLabel: 'Premium', onUpgrade });
    const buttons = (appAlert as jest.Mock).mock.calls[0][2];
    expect(buttons.map((b: any) => b.text)).toEqual(['İptal']);
    expect(onUpgrade).not.toHaveBeenCalled();
  });
});
