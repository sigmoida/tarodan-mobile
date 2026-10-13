import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AppTabBar } from '../AppTabBar';
import { tabPillBottomOffset, TAB_PILL_HEIGHT } from '../tabBarLayout';

jest.mock('../useShellCounts', () => ({
  useShellCounts: () => ({ cartCount: 0, notificationCount: 0, messageCount: 3, favoriteCount: 0 }),
}));
jest.mock('@/hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));

const routes = ['index', 'favorites/index', 'sell', 'messages/index', 'profile', 'create', 'notifications/index'];

function setup(activeIndex = 0) {
  const navigate = jest.fn();
  const state = { index: activeIndex, routes: routes.map((name) => ({ key: name, name })) };
  render(<AppTabBar state={state as never} navigation={{ navigate } as never} descriptors={{} as never} insets={{ top: 0, right: 0, bottom: 0, left: 0 }} />);
  return navigate;
}

describe('AppTabBar — yüzen hap', () => {
  it('sıra: Ana Sayfa, Favoriler, + (ortada), Mesajlar, Profil — "Ara" sekmesi yok', () => {
    setup();
    const ids = ['tab-home', 'tab-favorites', 'tab-sell', 'tab-messages', 'tab-profile'];
    ids.forEach((id) => expect(screen.getByTestId(id)).toBeTruthy());
    expect(screen.queryByLabelText('Ara')).toBeNull();
    expect(screen.getByLabelText('Favoriler')).toBeTruthy();
  });

  it('sekmeye dokununca ilgili rotaya gider; aktif sekmeye dokunmak gezinmez', () => {
    const navigate = setup(0);
    fireEvent.press(screen.getByTestId('tab-favorites'));
    expect(navigate).toHaveBeenCalledWith('favorites/index');
    navigate.mockClear();
    fireEvent.press(screen.getByTestId('tab-home'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('mesaj sekmesi okunmamış sayısını rozetle gösterir', () => {
    setup();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('hap alt konumu en az 12pt; yükseklik sabiti', () => {
    expect(tabPillBottomOffset(0)).toBe(12);
    expect(tabPillBottomOffset(34)).toBe(26);
    expect(TAB_PILL_HEIGHT).toBe(64);
  });
});
