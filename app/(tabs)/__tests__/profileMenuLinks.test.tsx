import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import i18n from '@/i18n/config';
import { ProfileMenuSections } from '../_components/ProfileSections';
import { DrawerMenu } from '../_components/DrawerMenu';
import { buildAccountPages } from '../_lib/accountPages';

const ACCOUNT_PAGES = buildAccountPages(i18n.t);

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
// Yan menü satırları (DrawerMenu) menü bağlamı + sayaç sorgusu ister; bu test yalnız rota sözleşmesini sınar.
jest.mock('../_hooks/useHomeBadges', () => ({ useHomeBadges: () => ({ pendingOffers: 0, pendingTrades: 0 }) }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) => {
    const state = { isAuthenticated: true };
    return sel ? sel(state) : state;
  },
}));
// Satın almanın açık olduğu platform (Android). iOS'ta ücretsiz kullanıcı
// "Üyelik Planı"nı görmez — ios-subscription-menu.test.tsx.
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));

const f: any = {
  isPaidTier: false,
  effectiveTier: 'free',
  handleLogout: jest.fn(),
};

/** Yan menüde (DrawerMenu) duran satırlar. */
const DRAWER_CASES: [string, string][] = [
  ['profile-payment-methods-link', '/settings/payment-methods'],
  ['profile-payment-history-link', '/settings/payment-history'],
  ['profile-payments-link', '/settings/payments'],
  ['profile-saved-searches-link', '/settings/saved-searches'],
  ['profile-discounts-link', '/settings/discounts'],
];
/** Profilde (ProfileMenuSections, Hesap grubu) duran satırlar. */
const PROFILE_CASES: [string, string][] = [['profile-membership-link', '/membership']];

/** Hesap sayfalarından yalnız `following` yan menüde (Koleksiyon); gerisi profilde. */
const DRAWER_ACCOUNT_ROUTES = ['following'];

describe('menü — daha önce erişilemeyen ekranlar', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(DRAWER_CASES)('yan menü: %s -> %s', (testID, route) => {
    const { getByTestId } = render(<DrawerMenu />);
    fireEvent.press(getByTestId(testID));
    expect(router.push).toHaveBeenCalledWith(route);
  });

  it.each(PROFILE_CASES)('profil: %s -> %s', (testID, route) => {
    const { getByTestId } = render(<ProfileMenuSections f={f} />);
    fireEvent.press(getByTestId(testID));
    expect(router.push).toHaveBeenCalledWith(route);
  });

  it.each(ACCOUNT_PAGES.map((p) => [p.route] as [string]))(
    'hesap sayfası /%s ekranına gidilebiliyor',
    (route) => {
      const inDrawer = DRAWER_ACCOUNT_ROUTES.includes(route);
      const { getByTestId } = render(inDrawer ? <DrawerMenu /> : <ProfileMenuSections f={f} />);
      fireEvent.press(getByTestId(`profile-account-${route}-link`));
      expect(router.push).toHaveBeenCalledWith(`/${route}`);
    },
  );

  // Yasal belgeler aynı adlı native rotaya gider (ekran web'in uygulama modu
  // sayfasını WebView'de açar) — giriş/kayıt/onay ekranlarındaki linkler de.
  it.each([
    ['privacy', '/privacy'],
    ['terms', '/terms'],
    ['distance-sales', '/distance-sales'],
    ['seller-agreement', '/seller-agreement'],
    ['refund-policy', '/refund-policy'],
    ['cookie-policy', '/cookies'],
  ])('yasal belge %s kendi ekranına (%s) gider', (slug, route) => {
    const { getByTestId } = render(<DrawerMenu />);
    fireEvent.press(getByTestId(`profile-legal-${slug}-link`));
    expect(router.push).toHaveBeenCalledWith(route);
  });
});
