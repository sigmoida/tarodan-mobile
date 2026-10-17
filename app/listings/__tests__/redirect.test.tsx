/**
 * `/listings` artık ekran değil: eski bağlantılar (kayıtlı yol, doğrudan push) sorgusu korunarak
 * ön filtreli aramaya yönlenir — 404 yok.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const mockParams: { current: Record<string, string | string[]> } = { current: {} };
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams.current,
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

import ListingsRedirect from '../index';

describe('/listings → /search yönlendirmesi', () => {
  beforeEach(() => mockRedirect.mockClear());

  it.each([
    [{}, '/search'],
    [{ tradeOnly: 'true' }, '/search?tradeOnly=true'],
    [{ sortBy: 'view_count_desc' }, '/search?sortBy=view_count_desc'],
    [{ discountOnly: 'true' }, '/search?discountOnly=true'],
    [{ manufacturer: 'Hot Wheels' }, '/search?manufacturer=Hot%20Wheels'],
    [{ categoryId: 'c1', category: 'Otomobil', scale: ['1:64', '1:43'] }, '/search?categoryId=c1&category=Otomobil&scale=1%3A64'],
  ])('%j → %s', (params, href) => {
    mockParams.current = params;
    render(<ListingsRedirect />);
    expect(mockRedirect).toHaveBeenCalledWith(href);
  });
});
