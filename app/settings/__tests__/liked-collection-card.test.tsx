/**
 * Beğenilen koleksiyon kartı: "Kaldır" metin butonu yok; kapak sağ üstündeki cam kalp beğeniyi
 * kaldırır (kart açılmaz); meta satırı "12 araç" + kalp ile beğeni sayısı.
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders, pushMock, resetRouterMocks } from '@/test-utils';
import { LikedCollectionCard } from '../liked-collections/_components/LikedCollectionCard';
import type { LikedCollectionsController } from '../liked-collections/_hooks/useLikedCollections';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

const collection = {
  id: 'c1',
  name: 'Klasikler',
  userName: 'Mehmet',
  coverImageUrl: 'https://example.com/c.jpg',
  itemCount: 12,
  likeCount: 9,
  viewCount: 0,
  isPublic: true,
};

beforeEach(() => resetRouterMocks());

it('kalp butonu beğeniyi kaldırır; metin "Kaldır" butonu yok; meta "12 araç" + 9', () => {
  const handleUnlike = jest.fn();
  const f = {
    handleUnlike,
    getImageUrl: () => collection.coverImageUrl,
  } as unknown as LikedCollectionsController;
  renderWithProviders(<LikedCollectionCard collection={collection} f={f} />);

  expect(screen.queryByText('Kaldır')).toBeNull();
  expect(screen.getByText('Klasikler')).toBeOnTheScreen();
  expect(screen.getByText('Mehmet')).toBeOnTheScreen();
  expect(screen.getByText('12 araç')).toBeOnTheScreen();
  expect(screen.getByText('9')).toBeOnTheScreen();

  fireEvent.press(screen.getByTestId('liked-collection-unlike-c1'));
  expect(handleUnlike).toHaveBeenCalledWith('c1');
  expect(pushMock).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('liked-collection-c1'));
  expect(pushMock).toHaveBeenCalledWith('/collections/c1');
});
