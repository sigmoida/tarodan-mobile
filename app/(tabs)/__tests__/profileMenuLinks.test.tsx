import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ProfileMenuSections } from '../_components/ProfileSections';
import { INFO_PAGES, ACCOUNT_PAGES } from '../_lib/infoPages';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const f: any = {
  isPaidTier: false,
  tierLabel: 'Free',
  effectiveTier: 'free',
  handleLogout: jest.fn(),
  handleDeleteAccount: jest.fn(),
};

const CASES: [string, string][] = [
  ['profile-payment-methods-link', '/settings/payment-methods'],
  ['profile-payment-history-link', '/settings/payment-history'],
  ['profile-payments-link', '/settings/payments'],
  ['profile-subscription-link', '/settings/subscription'],
  ['profile-saved-searches-link', '/settings/saved-searches'],
  ['profile-discounts-link', '/settings/discounts'],
];

describe('profil menüsü — daha önce erişilemeyen ekranlar', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(CASES)('%s -> %s', (testID, route) => {
    const { getByTestId } = render(<ProfileMenuSections f={f} />);
    fireEvent.press(getByTestId(testID));
    expect(router.push).toHaveBeenCalledWith(route);
  });

  it.each([...INFO_PAGES, ...ACCOUNT_PAGES].map((p) => [p.route] as [string]))(
    'menüsüz kalan /%s ekranına gidilebiliyor',
    (route) => {
      const prefix = INFO_PAGES.some((p) => p.route === route) ? 'info' : 'account';
      const { getByTestId } = render(<ProfileMenuSections f={f} />);
      fireEvent.press(getByTestId(`profile-${prefix}-${route}-link`));
      expect(router.push).toHaveBeenCalledWith(`/${route}`);
    },
  );

  it('hukuki sayfalar CMS ekranına yönlendirir', () => {
    const { getByTestId } = render(<ProfileMenuSections f={f} />);
    fireEvent.press(getByTestId('profile-legal-privacy-link'));
    expect(router.push).toHaveBeenCalledWith('/sayfa/privacy');
  });
});
