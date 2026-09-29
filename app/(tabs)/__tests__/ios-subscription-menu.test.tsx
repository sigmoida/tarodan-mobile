/**
 * Apple 2.1(b) "references to subscriptions": iOS'ta abonelik satılmıyor, bu
 * yüzden ücretsiz kullanıcı (App Review hesabı dahil) profilde "Aboneliğim"
 * girişini görmez. Ücretli üye görür — iOS'ta aboneliğini iptal edebileceği
 * tek yer orası (üyelik ekranındaki "Yönet" linki iOS'ta kapalı).
 */
import { render } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: false }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { ProfileMenuSections } from '../_components/ProfileSections';

const base: any = {
  tierLabel: 'Free',
  effectiveTier: 'free',
  handleLogout: jest.fn(),
  handleDeleteAccount: jest.fn(),
};

describe('iOS profil menüsü — Aboneliğim', () => {
  it('ücretsiz kullanıcı görmez', () => {
    const { queryByTestId } = render(<ProfileMenuSections f={{ ...base, isPaidTier: false }} />);
    expect(queryByTestId('profile-subscription-link')).toBeNull();
  });

  it('ücretli üye görür (iptal yolu açık kalır)', () => {
    const { getByTestId } = render(
      <ProfileMenuSections f={{ ...base, isPaidTier: true, tierLabel: 'Premium', effectiveTier: 'premium' }} />,
    );
    expect(getByTestId('profile-subscription-link')).toBeTruthy();
  });
});
