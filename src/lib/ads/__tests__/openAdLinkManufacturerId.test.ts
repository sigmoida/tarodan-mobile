/**
 * Reklam linki üreticiyi adla taşır; üretici listesi önbellekteyse açarken `manufacturerId` eklenir.
 * `resolveAdLink` saf kalır (kimlik eklemez).
 */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), dismissTo: jest.fn() },
}));

import { queryClient } from '@/lib/query/client';
import { qk } from '@/lib/query/keys';
import { openAdLink, resolveAdLink } from '../openAdLink';

beforeEach(() => {
  mockPush.mockClear();
  queryClient.clear();
});

it('önbellekte üretici varsa ad kimliğe çevrilip manufacturerId eklenir', () => {
  queryClient.setQueryData(qk.catalog.manufacturers, [
    { id: 'm-hw', name: 'Hot Wheels', slug: 'hot-wheels' },
  ]);
  expect(openAdLink('/listings?manufacturer=Hot+Wheels')).toBe(true);
  expect(mockPush).toHaveBeenLastCalledWith(
    '/listings?manufacturer=Hot+Wheels&manufacturerId=m-hw',
  );
});

it('locale önekli ve mutlak adres de aynı şekilde', () => {
  queryClient.setQueryData(qk.catalog.manufacturers, [{ id: 'm-hw', name: 'Hot Wheels' }]);
  openAdLink('https://tarodan.com.tr/en/listings?manufacturer=Hot%20Wheels');
  expect(mockPush).toHaveBeenLastCalledWith(
    '/listings?manufacturer=Hot%20Wheels&manufacturerId=m-hw',
  );
});

it('önbellek boşsa ya da ad bulunamazsa rota aynen (yalnız ad) açılır', () => {
  openAdLink('/listings?manufacturer=Hot+Wheels');
  expect(mockPush).toHaveBeenLastCalledWith('/listings?manufacturer=Hot+Wheels');

  queryClient.setQueryData(qk.catalog.manufacturers, [{ id: 'm-bb', name: 'Bburago' }]);
  openAdLink('/listings?manufacturer=Hot+Wheels');
  expect(mockPush).toHaveBeenLastCalledWith('/listings?manufacturer=Hot+Wheels');
});

it('linkte zaten manufacturerId varsa dokunulmaz; resolveAdLink saf kalır', () => {
  queryClient.setQueryData(qk.catalog.manufacturers, [{ id: 'm-hw', name: 'Hot Wheels' }]);
  openAdLink('/listings?manufacturer=Hot+Wheels&manufacturerId=zzz');
  expect(mockPush).toHaveBeenLastCalledWith(
    '/listings?manufacturer=Hot+Wheels&manufacturerId=zzz',
  );
  expect(resolveAdLink('/listings?manufacturer=Hot+Wheels')).toEqual({
    kind: 'route',
    route: '/listings?manufacturer=Hot+Wheels',
  });
});
