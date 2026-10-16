import { fireEvent, render } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { renderWithProviders } from '@/test-utils';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';
import { buildAccountPages } from '@/lib/menu/accountPages';
import { LEGAL_WEB_DOCS } from '@/lib/legal/webDocs';
import { ProfileMenuSections } from '../_components/ProfileSections';
import SettingsScreen from '../../settings';

const ACCOUNT_PAGES = buildAccountPages(i18n.t);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
// Menü satırları sayaç sorgusu ister; bu test yalnız rota sözleşmesini sınar.
jest.mock('../_hooks/useHomeBadges', () => ({ useHomeBadges: () => ({ pendingOffers: 0, pendingTrades: 0 }) }));
jest.mock('@/hooks/useMembershipTier', () => ({ useMembershipTier: () => ({ effectiveTier: 'free', isPaidTier: false }) }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) => {
    const state = { isAuthenticated: true, user: { id: 'u1' }, logout: jest.fn() };
    return sel ? sel(state) : state;
  },
}));
// Satın almanın açık olduğu platform (Android). iOS'ta ücretsiz kullanıcı
// "Üyelik Planı"nı görmez — app/settings/__tests__/settings-screen.test.tsx.
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));

/** Profilde (işlemler) duran satırlar. */
const PROFILE_CASES: [string, string][] = [
  ['profile-payment-history-link', '/settings/payment-history'],
  ['profile-payments-link', '/settings/payments'],
  ['profile-saved-searches-link', '/settings/saved-searches'],
  ['profile-discounts-link', '/settings/discounts'],
];
/** Ayarlar ekranında duran satırlar. */
const SETTINGS_CASES: [string, string][] = [
  ['profile-payment-methods-link', '/settings/payment-methods'],
  ['profile-membership-link', '/membership'],
  ['settings-edit-profile-link', '/settings/edit-profile'],
];

/** Hesap sayfalarından `following` Profil'de (Koleksiyon); gerisi (bülten) Ayarlar'da. */
const PROFILE_ACCOUNT_ROUTES = ['following'];

describe('menü — her satır kendi ekranına gider', () => {
  beforeEach(() => resetRouterMocks());

  it.each(PROFILE_CASES)('profil: %s -> %s', (testID, route) => {
    const { getByTestId } = renderWithProviders(<ProfileMenuSections />);
    fireEvent.press(getByTestId(testID));
    expect(pushMock).toHaveBeenCalledWith(route);
  });

  it.each(SETTINGS_CASES)('ayarlar: %s -> %s', (testID, route) => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId(testID));
    expect(pushMock).toHaveBeenCalledWith(route);
  });

  it.each(ACCOUNT_PAGES.map((p) => [p.route] as [string]))(
    'hesap sayfası /%s ekranına gidilebiliyor',
    (route) => {
      const inProfile = PROFILE_ACCOUNT_ROUTES.includes(route);
      const { getByTestId } = inProfile ? renderWithProviders(<ProfileMenuSections />) : render(<SettingsScreen />);
      fireEvent.press(getByTestId(`profile-account-${route}-link`));
      expect(pushMock).toHaveBeenCalledWith(`/${route}`);
    },
  );

  // Yasal belgeler aynı adlı native rotaya gider (ekran web'in uygulama modu
  // sayfasını WebView'de açar) — giriş/kayıt/onay ekranlarındaki linkler de.
  it.each(LEGAL_WEB_DOCS.map((doc) => [doc, `/${doc}`]))('yasal belge %s kendi ekranına (%s) gider', (slug, route) => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId(`profile-legal-${slug}-link`));
    expect(pushMock).toHaveBeenCalledWith(route);
  });
});
