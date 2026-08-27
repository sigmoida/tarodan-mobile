/**
 * Reddedilen ilanın gerekçesi.
 *
 * Sunucu `GET /products/my` yanıtında `rejectionReason` yayınlıyor (staging'de
 * ölçüldü, 2026-08-26 — alan VAR, hesaptaki eski kayıtta değeri `null`). Web bu
 * gerekçeyi 2026-08-13'ten beri ilan kartında gösteriyor; mobil göstermiyordu,
 * yani satıcı ilanının neden reddedildiğini hiçbir yerde öğrenemiyordu.
 *
 * Boşken HİÇBİR ŞEY çizilmez: boş bir kırmızı kutu, gerekçe yokmuş gibi değil
 * "bir şey bozuk" gibi görünür.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { MyListingCard } from '../my-listings/_components/MyListingsSections';

const listing = (over: Record<string, unknown> = {}) =>
  ({
    id: 'L1',
    title: 'Test İlanı',
    price: 100,
    status: 'rejected',
    viewCount: 0,
    likeCount: 0,
    images: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    condition: 'good',
    ...over,
  }) as any;

const noop = () => {};

describe('reddedilen ilan kartı', () => {
  it('gerekçe doluysa gösterir', () => {
    render(
      <MyListingCard
        listing={listing({ rejectionReason: 'Fotoğraflar ürünle uyuşmuyor' })}
        onMenu={noop}
      />,
    );
    expect(screen.getByText(/Fotoğraflar ürünle uyuşmuyor/)).toBeTruthy();
  });

  it('gerekçe null iken kutu çizilmez (ölçülen gerçek durum)', () => {
    render(<MyListingCard listing={listing({ rejectionReason: null })} onMenu={noop} />);
    expect(screen.queryByText(/Red gerekçesi/)).toBeNull();
  });

  it('alan hiç gelmediğinde de çizilmez (eski gövde şekli)', () => {
    render(<MyListingCard listing={listing()} onMenu={noop} />);
    expect(screen.queryByText(/Red gerekçesi/)).toBeNull();
  });

  it('reddedilmemiş ilanda gerekçe dolu olsa da gösterilmez', () => {
    render(
      <MyListingCard
        listing={listing({ status: 'active', rejectionReason: 'eski gerekçe' })}
        onMenu={noop}
      />,
    );
    expect(screen.queryByText(/eski gerekçe/)).toBeNull();
  });
});
