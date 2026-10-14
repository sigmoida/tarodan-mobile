/**
 * İlan formu yeniden giydirme (Dalga 4b / Paket C) — görünüm sözleşmeleri:
 * ✕ dokunma alanı ≥ 44 ve doğru indeksi kaldırır, "Kapak" yalnız ilk görselde, kota kartı
 * SectionCard + ProgressBar, kademe kartları dar ekranda tek sütun, kapı yüklemesi tek
 * standart loader, giriş kapısı EmptyState.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { theme } from '@/ui';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import {
  ListingHeaderBanners,
  ListingImagesSection,
  ListingShippingSection,
} from '../_components/ListingSections';
import { tierColumns } from '../_sections/ListingShippingSection';
import { ListingGates } from '../_components/ListingGates';
import type { ListingFormController } from '../_hooks/useListingForm';

/** Bölümlere yalnız okudukları alanlar verilir; denetleyicinin geri kalanı testte gereksiz. */
const asF = (o: Record<string, unknown>) => o as unknown as ListingFormController;

function imagesF(over: Record<string, unknown> = {}) {
  return asF({
    limits: { maxImagesPerListing: 5 },
    imageKeys: ['k1', 'k2'],
    imageUris: ['https://cdn.example.com/a.jpg', 'file:///tmp/b.jpg'],
    uploadingImages: false,
    pickImages: jest.fn(),
    removeImage: jest.fn(),
    ...over,
  });
}

describe('Fotoğraflar bölümü', () => {
  it('✕ IconButton: 44pt dokunma alanı (görsel 24 + hitSlop) ve doğru indeksi kaldırır', () => {
    const f = imagesF();
    render(<ListingImagesSection f={f} />);
    const remove = screen.getByTestId('listing-image-remove-1');
    const slop = remove.props.hitSlop;
    expect(24 + slop.top + slop.bottom).toBeGreaterThanOrEqual(theme.minTouchTarget);
    expect(24 + slop.left + slop.right).toBeGreaterThanOrEqual(theme.minTouchTarget);
    expect(remove.props.accessibilityLabel).toBe('2. görseli kaldır');
    fireEvent.press(remove);
    expect(f.removeImage as jest.Mock).toHaveBeenCalledWith(1);
  });

  it('"Kapak" yalnız ilk görselde', () => {
    render(<ListingImagesSection f={imagesF()} />);
    expect(screen.getAllByText('Kapak')).toHaveLength(1);
  });

  it('ekleme kutusu sade: süs emoji yok; dokununca galeri açılır', () => {
    const f = imagesF();
    render(<ListingImagesSection f={f} />);
    expect(screen.queryByText('📷')).toBeNull();
    fireEvent.press(screen.getByText('Görsel yüklemek için dokunun'));
    expect(f.pickImages as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('kontenjan doluysa ekleme kutusu yerine bilgi', () => {
    render(<ListingImagesSection f={imagesF({ imageKeys: ['1', '2', '3', '4', '5'] })} />);
    expect(screen.queryByTestId('listing-image-add')).toBeNull();
    expect(screen.getByText('Maksimum görsel sayısına ulaştınız')).toBeTruthy();
  });
});

describe('Kota kartı', () => {
  const base = {
    isEdit: false,
    limitsLoading: false,
    status: 'active',
    listingLimits: { isPremium: false, canCreateListing: true, maxListings: 10, currentCount: 4, remainingListings: 6 },
  };

  it('SectionCard + ProgressBar (doluluk oranı)', () => {
    render(<ListingHeaderBanners f={asF(base)} />);
    expect(screen.getByTestId('listing-limit-card')).toBeTruthy();
    expect(screen.getByText('İlan Hakkı: 4 / 10')).toBeTruthy();
    expect(screen.getByText('Kalan: 6')).toBeTruthy();
    // ProgressBar dolgu genişliği %40
    const fills = screen.UNSAFE_root.findAll(
      (n: { type: unknown; props: { style?: StyleProp<ViewStyle> } }) =>
        typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.width === '40%',
    );
    expect(fills.length).toBeGreaterThan(0);
  });

  it('yüklenirken iskelet, kart yok', () => {
    render(<ListingHeaderBanners f={asF({ ...base, limitsLoading: true })} />);
    expect(screen.getByTestId('listing-limit-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('listing-limit-card')).toBeNull();
  });
});

describe('Kargo paket kartları — ekran genişliği', () => {
  // Kartta "Paket ücreti" tutarı da var (tek satır, bölünmez): 375pt'de üç sütun sığmaz.
  it('geniş ekranda üç sütun; 375pt ve 360pt + font 1.3 tek sütun (satır kart)', () => {
    expect(tierColumns(430, 1)).toBe(3);
    expect(tierColumns(393, 1)).toBe(3);
    expect(tierColumns(430, 1.3)).toBe(1);
    expect(tierColumns(375, 1)).toBe(1);
    expect(tierColumns(360, 1.3)).toBe(1);
    expect(tierColumns(375, 1.3)).toBe(1);
  });

  it('kademe kartı seçim durumu ve basış', () => {
    const setShippingPackageTier = jest.fn();
    const f = asF({
      packageTiersLoading: false,
      packageTiersError: false,
      packageTiers: [
        { code: 'small', label: 'Kucuk', sampleWidth: null, sampleHeight: null, sampleLength: null },
        { code: 'large', label: 'Buyuk', sampleWidth: null, sampleHeight: null, sampleLength: null },
      ],
      shippingPackageTier: 'large',
      setShippingPackageTier,
    });
    render(<ListingShippingSection f={f} />);
    expect(screen.getByTestId('package-tier-large')).toHaveProp('accessibilityState', { selected: true });
    fireEvent.press(screen.getByText('Küçük Paket'));
    expect(setShippingPackageTier).toHaveBeenCalledWith('small');
  });
});

describe('Kapılar (create, sekme kökü)', () => {
  function Gate({ f }: { f: Record<string, unknown> }) {
    return ListingGates({ f: asF(f) }) ?? null;
  }

  it('yüklenirken tek standart loader (ScreenLoader)', () => {
    const { UNSAFE_getAllByType } = render(<Gate f={{ authLoading: true, isEdit: false }} />);
    expect(UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(1);
  });

  it('giriş yoksa EmptyState + Giriş Yap', () => {
    render(<Gate f={{ authLoading: false, isEdit: false, isAuthenticated: false }} />);
    expect(screen.getByTestId('listing-gate-login')).toBeTruthy();
    expect(screen.getByText('İlan oluşturmak için giriş yapmalısınız')).toBeTruthy();
    fireEvent.press(screen.getByText('Giriş Yap'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
  });
});
