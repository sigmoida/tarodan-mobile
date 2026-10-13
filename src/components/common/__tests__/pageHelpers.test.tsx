/**
 * Dalga 2 P3 ortak sayfa yardımcıları: AuthGatePage (misafir kapısı), RowListSkeleton (satır
 * iskeleti), GateScreen (banlı / kurumsal beklemede ekranlarının iskeleti).
 */
import React from 'react';
import { Text as RNText } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderWithProviders } from '@/test-utils';
import { AuthGatePage } from '../AuthGatePage';
import { RowListSkeleton } from '../RowListSkeleton';
import { GateScreen } from '../GateScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));

beforeEach(() => jest.clearAllMocks());

describe('AuthGatePage', () => {
  it('üst bar başlığı + boş durum + "Giriş Yap" düğmesi çizer; düğme girişe götürür', () => {
    renderWithProviders(<AuthGatePage title="Ödeme Geçmişi" emptyTitle="Giriş Yapın" subtitle="Ödemeleri görmek için" />);
    expect(screen.getByText('Ödeme Geçmişi')).toBeTruthy();
    expect(screen.getByText('Giriş Yapın')).toBeTruthy();
    expect(screen.getByText('Ödemeleri görmek için')).toBeTruthy();
    fireEvent.press(screen.getByText('Giriş Yap'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('emptyTitle verilmezse boş durum başlığı üst bar başlığıdır', () => {
    renderWithProviders(<AuthGatePage title="Favoriler" />);
    expect(screen.getAllByText('Favoriler').length).toBe(2);
  });
});

describe('RowListSkeleton', () => {
  it('varsayılan 5 satır, rows ile ayarlanır', () => {
    const { rerender } = renderWithProviders(<RowListSkeleton />);
    expect(screen.getByTestId('row-list-skeleton').children).toHaveLength(5);
    rerender(<RowListSkeleton rows={3} />);
    expect(screen.getByTestId('row-list-skeleton').children).toHaveLength(3);
  });
});

describe('GateScreen', () => {
  it('başlık, açıklama, ek içerik ve düğmeleri çizer', () => {
    renderWithProviders(
      <GateScreen
        icon="ban-outline"
        title="Hesabınız askıda"
        description="Açıklama metni"
        actions={<RNText>Çıkış Yap</RNText>}
      >
        <RNText>Ek not</RNText>
      </GateScreen>,
    );
    expect(screen.getByText('Hesabınız askıda')).toBeTruthy();
    expect(screen.getByText('Açıklama metni')).toBeTruthy();
    expect(screen.getByText('Ek not')).toBeTruthy();
    expect(screen.getByText('Çıkış Yap')).toBeTruthy();
  });
});
