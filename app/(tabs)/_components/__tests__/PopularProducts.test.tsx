/**
 * B2 regresyonu: loading / empty / content dalları farklı yüksekliklerde
 * render oluyordu (loading ≈150pt, dolu raf ≈250pt+, empty üçüncü bir
 * yükseklik), bu yüzden veri gelince "Popüler İlanlar" kutusu büyüyüp
 * altındaki "Tüm İlanlar" / "Koleksiyonlar" bölümlerini aşağı fırlatıyordu.
 * Üç dal da artık aynı `styles.popularRailContent` (POPULAR_RAIL_MIN_HEIGHT)
 * sarmalayıcısı içinde render edilmeli.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PopularProducts } from '../HomeSections';
import { styles, POPULAR_RAIL_MIN_HEIGHT } from '../../_lib/styles';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const noop = () => undefined;
const emptySet = new Set<string>();

it('loading durumunda sarmalayıcı ortak minHeight ile render edilir', () => {
  render(<PopularProducts items={[]} isLoading cartProductIds={emptySet} onProductPress={noop} />);
  const wrapper = screen.getByTestId('popular-rail-content');
  expect(wrapper.props.style).toEqual(styles.popularRailContent);
  expect(styles.popularRailContent.minHeight).toBe(POPULAR_RAIL_MIN_HEIGHT);
});

it('boş durumda sarmalayıcı aynı minHeight ile render edilir', () => {
  render(<PopularProducts items={[]} isLoading={false} cartProductIds={emptySet} onProductPress={noop} />);
  const wrapper = screen.getByTestId('popular-rail-content');
  expect(wrapper.props.style).toEqual(styles.popularRailContent);
});

it('dolu durumda sarmalayıcı aynı minHeight ile render edilir', () => {
  const items = [{ id: '1', title: 'Ürün 1', price: 100, images: [] }];
  render(<PopularProducts items={items} isLoading={false} cartProductIds={emptySet} onProductPress={noop} />);
  const wrapper = screen.getByTestId('popular-rail-content');
  expect(wrapper.props.style).toEqual(styles.popularRailContent);
});
