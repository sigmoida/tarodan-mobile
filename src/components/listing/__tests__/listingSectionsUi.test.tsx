/**
 * İlan formu yeniden giydirme (Dalga 4b / Paket C) — görünüm sözleşmeleri:
 * ✕ dokunma alanı ≥ 44 ve doğru KİMLİĞİ kaldırır, "Kapak" yalnız ilk görselde (2×2), çevir/kapak yap/menü, kota kartı
 * SectionCard + ProgressBar, kademe kartları dar ekranda tek sütun, kapı yüklemesi tek
 * standart loader, giriş kapısı EmptyState.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { theme } from '@/ui';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';

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

type ImgStatus = 'ready' | 'rotating' | 'queued' | 'uploading' | 'processing' | 'failed';
const img = (id: string, status: ImgStatus = 'ready', extra: Record<string, unknown> = {}) => ({
  id,
  cardKey: `card-${id}`,
  detailKey: `detail-${id}`,
  uri: `https://cdn.example.com/${id}.jpg`,
  status,
  ...extra,
});
/** Yeni seçilmiş, henüz yüklenmemiş kalem (yerel önizleme, anahtar yok). */
const local = (id: string, status: ImgStatus, extra: Record<string, unknown> = {}) => ({
  id,
  uri: `file:///tmp/${id}.jpg`,
  status,
  progress: 0,
  file: { uri: `file:///tmp/${id}.jpg`, name: `${id}.jpg`, type: 'image/jpeg' },
  ...extra,
});

function imagesF(over: Record<string, unknown> = {}) {
  const images = (over.images as ReturnType<typeof img>[] | undefined) ?? [img('a'), img('b'), img('c')];
  return asF({
    limits: { maxImagesPerListing: 5 },
    maxImages: 5,
    images,
    imageKeys: images
      .filter((i) => i.cardKey && i.status === 'ready')
      .map(({ cardKey, detailKey }) => ({ cardKey, detailKey })),
    uploadingImages: false,
    imageSubmitBlocker: null,
    pickImages: jest.fn(),
    retryImage: jest.fn(),
    removeImage: jest.fn(),
    rotateImage: jest.fn(),
    makeCoverImage: jest.fn(),
    moveImage: jest.fn(),
    shiftImage: jest.fn(),
    setImageDragActive: jest.fn(),
    ...over,
  });
}

/** Izgara karoları genişlik ölçülünce çizilir (3 sütun yerleşimi genişlikten türetilir). */
function layoutGrid(width = 300) {
  fireEvent(screen.getByTestId('listing-image-grid'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 0 } },
  });
}

/**
 * Sürüklemeyi bitirmeden yarıda bırakmak için Pan geri çağrıları doğrudan: `fireGestureHandler`
 * eksik END/FINALIZE durumlarını kendisi tamamlıyor.
 */
type PanEvent = { translationX: number; translationY: number };
function panHandlers(testId: string) {
  return (getByGestureTestId(testId) as unknown as {
    handlers: {
      onStart: (e: PanEvent) => void;
      onUpdate: (e: PanEvent) => void;
      onFinalize: (e: PanEvent, success: boolean) => void;
    };
  }).handlers;
}

const flatStyle = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style) as Record<string, number>;

describe('Fotoğraflar bölümü', () => {
  it('köşe düğmeleri (✕ / çevir / kapak yap): 44pt dokunma alanı (görsel 24 + hitSlop)', () => {
    render(<ListingImagesSection f={imagesF()} />);
    layoutGrid();
    for (const id of ['listing-image-remove-1', 'listing-image-rotate-1', 'listing-image-cover-1']) {
      const slop = screen.getByTestId(id).props.hitSlop;
      expect(24 + slop.top + slop.bottom).toBeGreaterThanOrEqual(theme.minTouchTarget);
      expect(24 + slop.left + slop.right).toBeGreaterThanOrEqual(theme.minTouchTarget);
    }
  });

  it('✕ görseli KİMLİĞİNDEN kaldırır (indeks değil)', () => {
    const f = imagesF();
    render(<ListingImagesSection f={f} />);
    layoutGrid();
    const remove = screen.getByTestId('listing-image-remove-1');
    expect(remove.props.accessibilityLabel).toBe('2. görseli kaldır');
    fireEvent.press(remove);
    expect(f.removeImage as jest.Mock).toHaveBeenCalledWith('b');
  });

  it('"Kapak" rozeti yalnız ilk görselde; diğerlerinde sıra numarası; kapakta "kapak yap" yok', () => {
    render(<ListingImagesSection f={imagesF()} />);
    layoutGrid();
    expect(screen.getAllByText('Kapak')).toHaveLength(1);
    expect(screen.getByTestId('listing-image-cover-badge')).toBeTruthy();
    expect(screen.getByTestId('listing-image-order-1')).toHaveTextContent('2');
    expect(screen.getByTestId('listing-image-order-2')).toHaveTextContent('3');
    expect(screen.queryByTestId('listing-image-cover-0')).toBeNull();
  });

  it('kapak karosu 2×2 (web telefon genişliği): 300pt → hücre 94.67, kapak 197.33', () => {
    render(<ListingImagesSection f={imagesF()} />);
    layoutGrid(300);
    const cover = flatStyle('listing-image-tile-0');
    const other = flatStyle('listing-image-tile-1');
    expect(cover.width).toBeCloseTo(197.33, 1);
    expect(other.width).toBeCloseTo(94.67, 1);
  });

  it('☆ kapak yap ve ↻ çevir doğru kalemi çağırır', () => {
    const f = imagesF();
    render(<ListingImagesSection f={f} />);
    layoutGrid();
    fireEvent.press(screen.getByTestId('listing-image-cover-2'));
    expect(f.makeCoverImage as jest.Mock).toHaveBeenCalledWith('c');
    expect(screen.getByTestId('listing-image-rotate-2').props.accessibilityLabel).toBe('3. görseli 90° çevir');
    fireEvent.press(screen.getByTestId('listing-image-rotate-2'));
    expect(f.rotateImage as jest.Mock).toHaveBeenCalledWith('c');
  });

  it('çevrilen karo kilitli: spinner, çevir/kapak yap düğmesi yok, sürükleme kapalı', () => {
    render(<ListingImagesSection f={imagesF({ images: [img('a'), img('b', 'rotating')] })} />);
    layoutGrid();
    expect(screen.queryByTestId('listing-image-rotate-1')).toBeNull();
    expect(screen.queryByTestId('listing-image-cover-1')).toBeNull();
    expect(screen.getByTestId('listing-image-open-1').props.accessibilityState).toMatchObject({ busy: true });
    expect(screen.getByTestId('listing-image-rotate-0')).toBeTruthy();
  });

  it('karoya dokunma eylem menüsünü açar: Sağa taşı → shiftImage(id, +1), Kapak yap → kimlikle', async () => {
    const f = imagesF();
    render(<ListingImagesSection f={f} />);
    layoutGrid();
    fireEvent.press(screen.getByTestId('listing-image-open-1'));
    expect(await screen.findByText('Görsel 2')).toBeTruthy();
    expect(screen.getByText('Kapak yap')).toBeTruthy();
    expect(screen.getByText('Sola taşı')).toBeTruthy();
    expect(screen.getByText('90° çevir')).toBeTruthy();
    expect(screen.getByText('Kaldır')).toBeTruthy();
    fireEvent.press(screen.getByTestId('listing-image-menu-right'));
    await waitFor(() => expect(f.shiftImage as jest.Mock).toHaveBeenCalledWith('b', 1));
  });

  it('menü: kapakta "Kapak yap" ve "Sola taşı" yok, sondaki görselde "Sağa taşı" yok', async () => {
    render(<ListingImagesSection f={imagesF({ images: [img('a')] })} />);
    layoutGrid();
    fireEvent.press(screen.getByTestId('listing-image-open-0'));
    expect(await screen.findByText('Görsel 1')).toBeTruthy();
    expect(screen.queryByText('Kapak yap')).toBeNull();
    expect(screen.queryByText('Sola taşı')).toBeNull();
    expect(screen.queryByText('Sağa taşı')).toBeNull();
    expect(screen.getByText('90° çevir')).toBeTruthy();
  });

  it('basılı tut + sürükle: 3. görsel kapak alanına bırakılınca moveImage(c, 0); form kaydırması kilitlenip açılır', async () => {
    const f = imagesF();
    render(<ListingImagesSection f={f} />);
    layoutGrid(300);
    // Yuva 2: x = 2 × (94.67 + 8) = 205.33, y = 102.67; merkez kapak karosunun içine taşınır.
    fireGestureHandler(getByGestureTestId('listing-image-drag-2'), [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: -90, translationY: -40 },
      { state: State.ACTIVE, translationX: -180, translationY: -80 },
      { state: State.END, translationX: -180, translationY: -80 },
    ]);
    // `scheduleOnRN` JS tarafında mikro görev kuyruğuna yazar.
    await act(() => Promise.resolve());
    expect(f.setImageDragActive as jest.Mock).toHaveBeenNthCalledWith(1, true);
    expect(f.setImageDragActive as jest.Mock).toHaveBeenLastCalledWith(false);
    expect(f.moveImage as jest.Mock).toHaveBeenCalledWith('c', 0);
  });

  it('yerinde bırakılan sürükleme sırayı değiştirmez', async () => {
    const f = imagesF();
    render(<ListingImagesSection f={f} />);
    layoutGrid(300);
    fireGestureHandler(getByGestureTestId('listing-image-drag-1'), [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: 4, translationY: 4 },
      { state: State.END, translationX: 4, translationY: 4 },
    ]);
    await act(() => Promise.resolve());
    expect(f.moveImage as jest.Mock).not.toHaveBeenCalled();
    expect(f.setImageDragActive as jest.Mock).toHaveBeenLastCalledWith(false);
  });

  it('sürüklenen karo bitiş bildirimi gelmeden sökülürse kilit kalkar, sonraki sürükleme çalışır', async () => {
    const f = imagesF();
    const view = render(<ListingImagesSection f={f} />);
    layoutGrid(300);
    // END/FINALIZE gönderilmez: karo sürükleme ortasında.
    const pan = panHandlers('listing-image-drag-2');
    pan.onStart({ translationX: 0, translationY: 0 });
    pan.onUpdate({ translationX: -40, translationY: 0 });
    await act(() => Promise.resolve());
    expect(f.setImageDragActive as jest.Mock).toHaveBeenLastCalledWith(true);

    // İkinci parmakla ✕: üst liste 'c'yi çıkarır, karo söküldü.
    const next = imagesF({ images: [img('a'), img('b')], setImageDragActive: f.setImageDragActive, moveImage: f.moveImage });
    view.rerender(<ListingImagesSection f={next} />);
    await act(() => Promise.resolve());
    expect(f.setImageDragActive as jest.Mock).toHaveBeenLastCalledWith(false);

    // Sürükleme durumu sıfırlandı: yeni sürükleme başlar ve bırakılır.
    fireGestureHandler(getByGestureTestId('listing-image-drag-1'), [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: -150, translationY: 0 },
      { state: State.END, translationX: -150, translationY: 0 },
    ]);
    await act(() => Promise.resolve());
    expect(f.moveImage as jest.Mock).toHaveBeenCalledWith('b', 0);
  });

  it('ızgara sürükleme ortasında sökülürse form kaydırma kilidi kalkar', async () => {
    const f = imagesF();
    const view = render(<ListingImagesSection f={f} />);
    layoutGrid(300);
    const pan = panHandlers('listing-image-drag-1');
    pan.onStart({ translationX: 0, translationY: 0 });
    pan.onUpdate({ translationX: -40, translationY: 0 });
    await act(() => Promise.resolve());
    view.unmount();
    expect(f.setImageDragActive as jest.Mock).toHaveBeenLastCalledWith(false);
  });

  it('sürükleme sırasında liste değişirse (yeni görsel) bırakış kimlikle bildirilir', async () => {
    const f = imagesF();
    const view = render(<ListingImagesSection f={f} />);
    layoutGrid(300);
    const pan = panHandlers('listing-image-drag-2');
    pan.onStart({ translationX: 0, translationY: 0 });
    pan.onUpdate({ translationX: -180, translationY: -80 });
    // Arada yükleme biter: sona 'd' eklenir — sürüklenen karonun yuvası korunur.
    view.rerender(<ListingImagesSection f={{ ...f, images: [img('a'), img('b'), img('c'), img('d')] } as typeof f} />);
    const after = panHandlers('listing-image-drag-2');
    after.onUpdate({ translationX: -180, translationY: -80 });
    after.onFinalize({ translationX: -180, translationY: -80 }, true);
    await act(() => Promise.resolve());
    expect(f.moveImage as jest.Mock).toHaveBeenCalledWith('c', 0);
    expect(f.setImageDragActive as jest.Mock).toHaveBeenLastCalledWith(false);
  });

  it('ekleme kutusu sade: süs emoji yok; dokununca galeri açılır', () => {
    const f = imagesF();
    render(<ListingImagesSection f={f} />);
    expect(screen.queryByText('📷')).toBeNull();
    fireEvent.press(screen.getByText('Görsel yüklemek için dokunun'));
    expect(f.pickImages as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('kontenjan doluysa ekleme kutusu yerine bilgi', () => {
    render(
      <ListingImagesSection f={imagesF({ images: ['1', '2', '3', '4', '5'].map((id) => img(id)) })} />,
    );
    expect(screen.queryByTestId('listing-image-add')).toBeNull();
    expect(screen.getByText('Maksimum görsel sayısına ulaştınız')).toBeTruthy();
  });

  it('yüklenen karo: yerel önizleme + yüzde + ilerleme çubuğu; sırada / işleniyor etiketleri; eylemler kapalı', () => {
    render(
      <ListingImagesSection
        f={imagesF({
          images: [
            img('a'),
            local('b', 'uploading', { progress: 40 }),
            local('c', 'queued'),
            local('d', 'processing', { progress: 100 }),
          ],
          uploadingImages: true,
        })}
      />,
    );
    layoutGrid();
    expect(screen.getByText('Yükleniyor %40')).toBeTruthy();
    expect(screen.getByText('Sırada')).toBeTruthy();
    expect(screen.getByText('İşleniyor')).toBeTruthy();
    expect(screen.getByLabelText('2. görsel yükleniyor').props.accessibilityValue).toMatchObject({ now: 40 });
    expect(screen.queryByTestId('listing-image-rotate-1')).toBeNull();
    expect(screen.queryByTestId('listing-image-cover-1')).toBeNull();
    // Kaldır (iptal) her durumda açık.
    expect(screen.getByTestId('listing-image-remove-1')).toBeTruthy();
    // Sayaç yalnız yüklenmişleri sayar; yükleme sürerken de yeni görsel eklenebilir.
    expect(screen.getByText('1 / 5 yüklendi')).toBeTruthy();
    expect(screen.getByTestId('listing-image-add')).toBeTruthy();
  });

  it('hatalı karo: "Yüklenemedi" + "Tekrar dene" doğru kimliği çağırır; diğer karolar etkilenmez; neden yazılı', () => {
    const f = imagesF({
      images: [img('a'), local('b', 'failed', { error: 'Dosya bozuk' }), img('c')],
      imageSubmitBlocker: {
        reason: 'failed',
        message: 'Yüklenemeyen görsel var. Tekrar deneyin ya da o görseli kaldırın.',
      },
    });
    render(<ListingImagesSection f={f} />);
    layoutGrid();
    expect(screen.getByTestId('listing-image-failed-1')).toBeTruthy();
    expect(screen.getByText('Yüklenemedi')).toBeTruthy();
    expect(screen.queryByTestId('listing-image-failed-0')).toBeNull();
    expect(screen.getByTestId('listing-image-rotate-2')).toBeTruthy();
    fireEvent.press(screen.getByTestId('listing-image-retry-1'));
    expect(f.retryImage as jest.Mock).toHaveBeenCalledWith('b');
    fireEvent.press(screen.getByTestId('listing-image-remove-1'));
    expect(f.removeImage as jest.Mock).toHaveBeenCalledWith('b');
    expect(screen.getByTestId('listing-image-blocker')).toBeTruthy();
    expect(screen.getByText('Yüklenemeyen görsel var. Tekrar deneyin ya da o görseli kaldırın.')).toBeTruthy();
  });

  it('hatalı kapak karosu sunucu mesajını gösterir', () => {
    render(<ListingImagesSection f={imagesF({ images: [local('a', 'failed', { error: 'Dosya bozuk' })] })} />);
    layoutGrid();
    expect(screen.getByText('Dosya bozuk')).toBeTruthy();
  });

  it('bekleyen ve hatalı kalemler de kontenjandan düşer', () => {
    render(
      <ListingImagesSection
        f={imagesF({
          images: [img('1'), img('2'), local('3', 'uploading'), local('4', 'queued'), local('5', 'failed')],
        })}
      />,
    );
    expect(screen.queryByTestId('listing-image-add')).toBeNull();
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
  // Kartta "Paket ücreti" tutarı da var (tek satır, bölünmez): ~380pt altında üç sütun sığmaz.
  it('font 1: 384/390/393/430 üç sütun, 375/360 tek sütun (satır kart)', () => {
    expect(tierColumns(430, 1)).toBe(3);
    expect(tierColumns(393, 1)).toBe(3);
    expect(tierColumns(390, 1)).toBe(3);
    expect(tierColumns(384, 1)).toBe(3);
    expect(tierColumns(375, 1)).toBe(1);
    expect(tierColumns(360, 1)).toBe(1);
  });

  it('font 1.3: tüm genişliklerde tek sütun', () => {
    for (const w of [360, 375, 390, 393, 430]) expect(tierColumns(w, 1.3)).toBe(1);
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
