/**
 * Apple 2.1(b) "references to subscriptions": iOS'ta abonelik satılmıyor, bu
 * yüzden ücretsiz kullanıcı (App Review hesabı dahil) profilde "Üyelik Planı"
 * girişini görmez. Ücretli üye görür — planını ve abonelik durumunu salt
 * görüntüler. "Aboneliğim" ayrı satırı kalktı (Üyelik Planı ile birleşti).
 */
import { render } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: false }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { ProfileMenuSections } from '../_components/ProfileSections';

const base: any = {
  tierLabel: 'Free',
  effectiveTier: 'free',
  handleLogout: jest.fn(),
};

describe('iOS profil menüsü — ayrı "Aboneliğim" satırı yok', () => {
  it('ücretli üyede de yalnız tek üyelik satırı var', () => {
    const { queryByTestId, getByTestId } = render(
      <ProfileMenuSections f={{ ...base, isPaidTier: true, tierLabel: 'Premium', effectiveTier: 'premium' }} />,
    );
    expect(queryByTestId('profile-subscription-link')).toBeNull();
    expect(getByTestId('profile-membership-link')).toBeTruthy();
  });
});

/** Aynı gerekçe: "Üyelik Planı" ücretsiz iOS kullanıcısına yalnız "Ücretsiz" gösteren bir ekran açıyordu. */
describe('iOS profil menüsü — Üyelik Planı', () => {
  it('ücretsiz kullanıcı görmez', () => {
    const { queryByTestId } = render(<ProfileMenuSections f={{ ...base, isPaidTier: false }} />);
    expect(queryByTestId('profile-membership-link')).toBeNull();
  });

  it('ücretli üye görür', () => {
    const { getByTestId } = render(
      <ProfileMenuSections f={{ ...base, isPaidTier: true, tierLabel: 'Premium', effectiveTier: 'premium' }} />,
    );
    expect(getByTestId('profile-membership-link')).toBeTruthy();
  });
});
