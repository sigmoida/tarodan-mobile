/**
 * Misafirken çekilen listeler girişten sonra ekranda kalmamalı.
 *
 * Canlıdaki test şeridi hesabı (App Review) canlı ilanları göremez: misafirken
 * önbelleğe giren canlı ilan listesi girişten sonra 5 dk (staleTime) ekranda
 * kalıyordu ve ilana dokunmak test token'ıyla `404 Ürün bulunamadı` veriyordu.
 */
// resetUserStores → cartStore (AsyncStorage persist); native modül testte yok.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { QueryObserver } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/client';
import { resetServerStateForNewSession } from '../resetUserStores';

afterEach(() => queryClient.clear());

describe('resetServerStateForNewSession', () => {
  it('ekranda açık bir listeyi yeni oturumla hemen yeniden çeker', async () => {
    let viewer = 'guest';
    const observer = new QueryObserver(queryClient, {
      queryKey: ['test', 'home-latest'],
      queryFn: async () => (viewer === 'guest' ? ['canlı-ilan'] : ['test-ilanı']),
      staleTime: 1000 * 60 * 5,
    });
    const unsubscribe = observer.subscribe(() => {});
    await observer.refetch();
    expect(observer.getCurrentResult().data).toEqual(['canlı-ilan']);

    viewer = 'test-account';
    await resetServerStateForNewSession();

    expect(observer.getCurrentResult().data).toEqual(['test-ilanı']);
    unsubscribe();
  });

  it('ekranda olmayan sorguların eski verisini atar', async () => {
    queryClient.setQueryData(['test', 'product-detail'], { id: 'canlı' });

    await resetServerStateForNewSession();

    expect(queryClient.getQueryData(['test', 'product-detail'])).toBeUndefined();
  });
});
