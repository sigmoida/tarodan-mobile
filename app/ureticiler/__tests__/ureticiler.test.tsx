/**
 * Üreticiler (web /manufacturers): tek liste ekranı; eski /brands listesi buraya yönlenir.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
}));

const mockList = jest.fn();
jest.mock('../_hooks/useManufacturers', () => ({ useManufacturers: () => mockList() }));

import ManufacturersScreen from '../index';
import BrandsIndexRedirect from '../../brands/index';

const base = {
  items: [
    { id: 'm1', name: 'Hot Wheels', slug: 'hot-wheels', productCount: 12 },
    { id: 'm2', name: 'Bburago', slug: 'bburago' },
  ],
  hasAny: true,
  search: '',
  setSearch: jest.fn(),
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  isRefetching: false,
};

describe('Üreticiler ekranı', () => {
  it('başlık "Üreticiler"; satırlar ad ve ürün sayısını gösterir, dokununca detaya gider', () => {
    mockList.mockReturnValue(base);
    render(<ManufacturersScreen />);
    expect(screen.getByText('Üreticiler')).toBeTruthy();
    expect(screen.getByText('Hot Wheels')).toBeTruthy();
    expect(screen.getByText('12 ürün')).toBeTruthy();
    fireEvent.press(screen.getByText('Bburago'));
    expect(router.push).toHaveBeenCalledWith('/ureticiler/bburago');
  });

  it('yükleniyor: iskelet', () => {
    mockList.mockReturnValue({ ...base, items: [], isLoading: true });
    render(<ManufacturersScreen />);
    expect(screen.getByTestId('manufacturers-skeleton')).toBeTruthy();
  });

  it('hiç üretici yoksa ve aramada eşleşme yoksa farklı boş durum metni', () => {
    mockList.mockReturnValue({ ...base, items: [], hasAny: false });
    const { unmount } = render(<ManufacturersScreen />);
    expect(screen.getByText('Henüz üretici yok')).toBeTruthy();
    unmount();
    mockList.mockReturnValue({ ...base, items: [], hasAny: true, search: 'zzz' });
    render(<ManufacturersScreen />);
    expect(screen.getByText('Sonuç bulunamadı')).toBeTruthy();
  });
});

describe('eski /brands listesi', () => {
  it('/ureticiler\'e yönlenir', () => {
    render(<BrandsIndexRedirect />);
    expect(screen.getByTestId('redirect').props.children).toBe('/ureticiler');
  });
});
