/**
 * Ana Sayfa yan menüsü (hamburger): açılış/kapanış, satıra basınca önce kapanıp yönlendirme,
 * accordion, sayaç rozetleri, misafir görünümü ve profil-yalnız satırların yan menüde olmaması.
 */
import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { renderWithProviders, pushMock, resetRouterMocks } from '@/test-utils';
import { SideMenuProvider, useSideMenu } from '@/components/shell/SideMenuContext';
import { SideMenuHost } from '@/components/shell/SideMenuHost';
import { useAuthStore } from '@/stores/authStore';
import { useSideMenuStore } from '@/stores/sideMenuStore';
import { DrawerMenu } from '../DrawerMenu';
import { DrawerMenuRow } from '../DrawerMenuRow';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('expo-status-bar', () => ({ StatusBar: () => null, setStatusBarStyle: jest.fn() }));

let mockBadges = { pendingOffers: 0, pendingTrades: 0 };
jest.mock('../../_hooks/useHomeBadges', () => ({ useHomeBadges: () => mockBadges }));

function Probe() {
  const { open, isOpen } = useSideMenu();
  return (
    <>
      <Text testID="state">{isOpen ? 'open' : 'closed'}</Text>
      <Text testID="open" onPress={open}>
        aç
      </Text>
    </>
  );
}

function setup() {
  const utils = renderWithProviders(
    <SideMenuProvider>
      <Probe />
      <SideMenuHost menu={<DrawerMenu />}>
        <Text>uygulama</Text>
      </SideMenuHost>
    </SideMenuProvider>,
  );
  fireEvent.press(screen.getByTestId('open'));
  act(() => {
    jest.advanceTimersByTime(600);
  });
  return utils;
}

const state = () => screen.getByTestId('state').children.join('');

beforeEach(() => {
  jest.useFakeTimers();
  resetRouterMocks();
  mockBadges = { pendingOffers: 0, pendingTrades: 0 };
  useSideMenuStore.getState().reset();
  useAuthStore.setState({ isAuthenticated: true });
});
afterEach(() => {
  jest.useRealTimers();
});

describe('DrawerMenu — üye', () => {
  it('Favoriler üstte tek satır; ana başlıklar profileMenu gruplarından; Hesap/Mesajlar/Bildirimler yok', () => {
    setup();
    expect(screen.getByTestId('side-menu')).toBeTruthy();
    expect(screen.getByTestId('profile-favorites-link')).toBeTruthy();
    for (const title of ['Alışveriş', 'Finans', 'Koleksiyon', 'Analiz', 'İletişim', 'Bilgi ve Yasal']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.queryByText('Hesap')).toBeNull();
    expect(screen.queryByText('Mesajlar')).toBeNull();
    expect(screen.queryByText('Bildirimler')).toBeNull();
    expect(screen.queryByTestId('side-menu-guest')).toBeNull();
  });

  it('mevcut profil testID\'leri yan menüde aynı id ile durur', () => {
    setup();
    for (const id of [
      'profile-orders-link',
      'profile-sales-link',
      'profile-trades-link',
      'profile-offers-link',
      'profile-discounts-link',
      'profile-payments-link',
      'profile-payment-methods-link',
      'profile-payment-history-link',
      'profile-refunds-link',
      'profile-saved-searches-link',
      'profile-account-following-link',
      'profile-info-guides-link',
      'profile-legal-privacy-link',
    ]) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });

  it('profile ait satırlar (üyelik, dil, engellenenler, kurumsal, bülten) yan menüde yok', () => {
    setup();
    for (const id of [
      'profile-membership-link',
      'profile-subscription-link',
      'profile-language-link',
      'profile-blocked-users-link',
      'profile-account-newsletter-link',
      'settings-business-application',
      'profile-logout-button',
    ]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });

  it('satıra basınca menü kapanır ve rota açılır', () => {
    setup();
    fireEvent.press(screen.getByTestId('profile-orders-link'));
    expect(state()).toBe('closed');
    expect(pushMock).toHaveBeenCalledWith('/orders');
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.queryByTestId('side-menu')).toBeNull();
  });

  it('Favoriler satırı /favorites açar', () => {
    setup();
    fireEvent.press(screen.getByTestId('profile-favorites-link'));
    expect(pushMock).toHaveBeenCalledWith('/favorites');
    expect(state()).toBe('closed');
  });

  it('accordion: başlığa basınca grup kapanır/açılır; expanded durumu bildirilir', () => {
    setup();
    const toggle = () => screen.getByTestId('side-menu-section-commerce-toggle');
    expect(toggle().props.accessibilityState.expanded).toBe(true);
    expect(screen.getByTestId('profile-orders-link')).toBeTruthy();
    fireEvent.press(toggle());
    expect(toggle().props.accessibilityState.expanded).toBe(false);
    expect(screen.queryByTestId('profile-orders-link')).toBeNull();
    // Diğer gruplar etkilenmez.
    expect(screen.getByTestId('profile-payments-link')).toBeTruthy();
    fireEvent.press(toggle());
    expect(screen.getByTestId('profile-orders-link')).toBeTruthy();
  });

  it('chevron yönü: açıkken aşağı, kapalıyken sağ; başlık/X yok; gruplar arası tam genişlik çizgi', () => {
    setup();
    const toggle = () => screen.getByTestId('side-menu-section-commerce-toggle');
    expect(screen.queryByText('Menü')).toBeNull();
    expect(screen.queryByTestId('side-menu-close')).toBeNull();
    // Üstte sabit Favoriler + 6 başlıklı grup → her grubun üstünde 6 ayırıcı.
    expect(screen.getAllByTestId('side-menu-divider')).toHaveLength(6);
    expect(within(toggle()).getByTestId('icon-chevron-down')).toBeTruthy();
    expect(within(toggle()).queryByTestId('icon-chevron-right')).toBeNull();
    fireEvent.press(toggle());
    expect(within(toggle()).getByTestId('icon-chevron-right')).toBeTruthy();
    expect(within(toggle()).queryByTestId('icon-chevron-down')).toBeNull();
  });

  it('kapalı grup durumu oturum boyunca hatırlanır (menü kapanıp açılınca)', () => {
    setup();
    fireEvent.press(screen.getByTestId('side-menu-section-finance-toggle'));
    fireEvent.press(screen.getByTestId('side-menu-overlay'));
    act(() => {
      jest.advanceTimersByTime(600);
    });
    fireEvent.press(screen.getByTestId('open'));
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.queryByTestId('profile-payments-link')).toBeNull();
    expect(screen.getByTestId('profile-orders-link')).toBeTruthy();
  });

  it('bekleyen teklif/takas sayaçları rozet olarak durur (99+ sınırı)', () => {
    mockBadges = { pendingOffers: 3, pendingTrades: 120 };
    setup();
    expect(screen.getByTestId('profile-offers-link-badge')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('sayaç 0 ise rozet çizilmez', () => {
    setup();
    expect(screen.queryByTestId('profile-offers-link-badge')).toBeNull();
    expect(screen.queryByTestId('profile-trades-link-badge')).toBeNull();
  });
});

describe('DrawerMenu — misafir', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false });
  });

  it('üstte Giriş Yap / Kayıt Ol; yalnız yardım ve bilgi/yasal grupları', () => {
    setup();
    expect(screen.getByTestId('side-menu-guest')).toBeTruthy();
    expect(screen.getByTestId('side-menu-login')).toBeTruthy();
    expect(screen.getByTestId('side-menu-register')).toBeTruthy();
    expect(screen.getByText('İletişim')).toBeTruthy();
    expect(screen.getByText('Bilgi ve Yasal')).toBeTruthy();
    expect(screen.getByTestId('side-menu-item-help')).toBeTruthy();
    expect(screen.queryByTestId('side-menu-item-support')).toBeNull();
    for (const title of ['Alışveriş', 'Finans', 'Koleksiyon', 'Analiz']) {
      expect(screen.queryByText(title)).toBeNull();
    }
    expect(screen.queryByTestId('profile-favorites-link')).toBeNull();
    expect(screen.queryByTestId('profile-orders-link')).toBeNull();
  });

  it('Giriş Yap menüyü kapatıp giriş ekranını açar', () => {
    setup();
    fireEvent.press(screen.getByTestId('side-menu-login'));
    expect(state()).toBe('closed');
    expect(pushMock).toHaveBeenCalledWith('/(auth)/login');
  });

  it('Kayıt Ol kayıt ekranını açar', () => {
    setup();
    fireEvent.press(screen.getByTestId('side-menu-register'));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/register');
  });
});

describe('DrawerMenuRow — açıklama', () => {
  it('description verilirse etiketin altında çizilir, yoksa çizilmez', () => {
    const base = { key: 'orders', label: 'Siparişlerim', to: '/orders', testID: 'row-a' };
    const { rerender } = renderWithProviders(<DrawerMenuRow item={base} onPress={jest.fn()} />);
    expect(screen.queryByTestId('row-a-description')).toBeNull();
    rerender(<DrawerMenuRow item={{ ...base, description: 'Reklamsız göz atma' }} onPress={jest.fn()} />);
    expect(screen.getByText('Reklamsız göz atma')).toBeTruthy();
  });
});
