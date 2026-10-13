import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import i18n from '@/i18n/config';
import { ProfileMenuSections } from '../_components/ProfileSections';
import { DrawerMenu } from '../_components/DrawerMenu';
import { buildInfoPages, buildAccountPages } from '../_lib/infoPages';

const INFO_PAGES = buildInfoPages(i18n.t);
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
// "Aboneliğim"i görmez — ios-subscription-menu.test.tsx.
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));

const f: any = {
  isPaidTier: false,
  tierLabel: 'Free',
  effectiveTier: 'free',
  handleLogout: jest.fn(),
  handleDeleteAccount: jest.fn(),
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
const PROFILE_CASES: [string, string][] = [['profile-subscription-link', '/settings/subscription']];

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

  it.each([...INFO_PAGES, ...ACCOUNT_PAGES].map((p) => [p.route] as [string]))(
    'menüsüz kalan /%s ekranına gidilebiliyor',
    (route) => {
      const prefix = INFO_PAGES.some((p) => p.route === route) ? 'info' : 'account';
      const inDrawer = prefix === 'info' || DRAWER_ACCOUNT_ROUTES.includes(route);
      const { getByTestId } = render(inDrawer ? <DrawerMenu /> : <ProfileMenuSections f={f} />);
      fireEvent.press(getByTestId(`profile-${prefix}-${route}-link`));
      expect(router.push).toHaveBeenCalledWith(`/${route}`);
    },
  );

  // CMS sayfaları (`/pages/*`) production'da yayınlanmamış (2026-09-29: 404),
  // menü "Sayfa bulunamadı" gösteriyordu. Hukuki metinlerin uygulamada statik
  // ekranı var — giriş/kayıt ekranındaki linkler de onları açıyor.
  it.each([
    ['privacy', '/privacy'],
    ['terms', '/terms'],
    ['cookie-policy', '/cookies'],
  ])('hukuki sayfa %s statik ekrana (%s) gider', (slug, route) => {
    const { getByTestId } = render(<DrawerMenu />);
    fireEvent.press(getByTestId(`profile-legal-${slug}-link`));
    expect(router.push).toHaveBeenCalledWith(route);
  });
});
