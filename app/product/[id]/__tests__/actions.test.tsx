/**
 * Ürün detayı CTA'ları. Sabit alt bar: fiyat · kare "Hemen Al" · geniş "Sepete Ekle" (sepetteyse
 * "Sepete Git"); satılamayan ilanda web durum etiketi + pasif; sahipte fiyat + "Düzenle".
 * Barın üstünde teklif/takas satırı (tek giriş; görünürlük `getOfferTradeAvailability`).
 * İçerik eylem satırı: adet seçici (stok>1); sahipte Koleksiyona Ekle.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ProductBuyBar,
  ProductOfferTradeRow,
  ProductSecondaryActions,
  quantityLimit,
} from '../_components/ProductActions';
import { getOfferTradeAvailability } from '../_lib/engagement';
import type { Product } from '../_lib/types';
import { getProductNotice } from '../_lib/notice';
import i18n from '@/i18n/config';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => ({ canTrade: true, showCollectionEntry: true }),
}));

const base = { id: 'p1', title: 'Model', price: 100, status: 'active', availableQuantity: 5, images: [] };
const noop = () => undefined;

function bar(over: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
  return render(
    <ProductBuyBar
      product={{ ...base, ...over } as any}
      isOwner={false}
      isOutOfStock={false}
      inCart={false}
      onAddToCart={noop}
      onBuyNow={noop}
      onGoToCart={noop}
      onEdit={noop}
      {...props}
    />,
  );
}

describe('alt bar: fiyat · Hemen Al · Sepete Ekle', () => {
  it('stokta: fiyat + "Hemen Al" + "Sepete Ekle"; adet seçici barda değil', () => {
    bar();
    expect(screen.getByTestId('product-bar-price').props.children).toBe('100,00 TL');
    expect(screen.getByTestId('product-detail-buy-now-button')).toBeTruthy();
    expect(screen.getByText('Hemen Al')).toBeTruthy();
    expect(screen.getByText('Sepete Ekle')).toBeTruthy();
    expect(screen.queryByLabelText('Adedi arttır')).toBeNull();
  });

  it('indirimde eski fiyat üstü çizili, güncel fiyat tek satır', () => {
    bar({ price: 80, originalPrice: 100, discountPercent: 20 });
    expect(screen.getByTestId('product-bar-price').props.children).toBe('80,00 TL');
    expect(screen.getByTestId('product-bar-price').props.numberOfLines).toBe(1);
    const old = screen.getByTestId('product-bar-price-old');
    expect(old.props.children).toBe('100,00 TL');
    const style = Object.assign({}, ...[old.props.style].flat(Infinity).filter(Boolean));
    expect(style.textDecorationLine).toBe('line-through');
  });

  it('indirim yoksa eski fiyat yok', () => {
    bar();
    expect(screen.queryByTestId('product-bar-price-old')).toBeNull();
  });

  it('"Sepete Ekle" → onAddToCart, "Hemen Al" → onBuyNow', () => {
    const onAddToCart = jest.fn();
    const onBuyNow = jest.fn();
    bar({}, { onAddToCart, onBuyNow });
    fireEvent.press(screen.getByTestId('product-detail-add-to-cart-button'));
    expect(onAddToCart).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('product-detail-buy-now-button'));
    expect(onBuyNow).toHaveBeenCalledTimes(1);
  });

  it('sepetteyse birincil düğme "Sepete Git"', () => {
    const onGoToCart = jest.fn();
    bar({}, { inCart: true, onGoToCart });
    expect(screen.queryByTestId('product-detail-add-to-cart-button')).toBeNull();
    fireEvent.press(screen.getByText('Sepete Git'));
    expect(onGoToCart).toHaveBeenCalled();
    // Hemen Al sepetteyken de durur (yalnız bu ürünle ödeme).
    expect(screen.getByTestId('product-detail-buy-now-button')).toBeTruthy();
  });

  it('stok bitti / satıldı / rezerve: Hemen Al yok, birincil pasif + web etiketi', () => {
    const disabled = () =>
      screen.getByTestId('product-detail-out-of-stock-button').props.accessibilityState?.disabled;
    const { rerender } = bar({ availableQuantity: 0 }, { isOutOfStock: true });
    expect(screen.getByText('Stok bitti')).toBeTruthy();
    expect(disabled()).toBe(true);
    expect(screen.queryByTestId('product-detail-buy-now-button')).toBeNull();
    for (const [status, label] of [
      ['sold', 'Satıldı'],
      ['reserved', 'Rezerve Edildi'],
    ]) {
      rerender(
        <ProductBuyBar
          product={{ ...base, status } as any}
          isOwner={false}
          isOutOfStock
          inCart={false}
          onAddToCart={noop}
          onBuyNow={noop}
          onGoToCart={noop}
          onEdit={noop}
        />,
      );
      expect(screen.getByText(label)).toBeTruthy();
      expect(disabled()).toBe(true);
    }
  });

  it('stok bitti ama sepette: "Sepete Git" değil pasif durum düğmesi', () => {
    bar({ availableQuantity: 0 }, { isOutOfStock: true, inCart: true });
    expect(screen.queryByText('Sepete Git')).toBeNull();
    expect(screen.getByTestId('product-detail-out-of-stock-button')).toBeTruthy();
  });

  it('sahip: fiyat + Düzenle; satın alma düğmesi yok', () => {
    const onEdit = jest.fn();
    bar({}, { isOwner: true, onEdit });
    expect(screen.getByTestId('product-bar-price')).toBeTruthy();
    expect(screen.queryByText('Hemen Al')).toBeNull();
    expect(screen.queryByText('Sepete Ekle')).toBeNull();
    fireEvent.press(screen.getByTestId('product-detail-edit-button'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('etiketler tek satır (sarma yok) — 360pt + 1.3 ölçek için Button küçültür', () => {
    bar();
    expect(screen.getByText('Sepete Ekle').props.numberOfLines).toBe(1);
    expect(screen.getByText('Hemen Al').props.numberOfLines).toBe(1);
    expect(screen.getByText('Hemen Al').props.adjustsFontSizeToFit).toBe(true);
  });
});

describe('adet tavanı', () => {
  it('müsait stok ve 20 sınırı; sahip/satılmış → yok', () => {
    expect(quantityLimit(base as any, false)).toBe(5);
    expect(quantityLimit({ ...base, availableQuantity: 50 } as any, false)).toBe(20);
    expect(quantityLimit({ ...base, availableQuantity: 5 } as any, true)).toBeNull();
    expect(quantityLimit({ ...base, status: 'sold' } as any, false)).toBeNull();
  });
});

describe('teklif/takas görünürlüğü (tek kaynak)', () => {
  const avail = (over: Record<string, unknown> = {}, opts: Partial<{ isOwner: boolean; isOutOfStock: boolean }> = {}) =>
    getOfferTradeAvailability({ ...base, ...over } as Product, {
      isOwner: false,
      isOutOfStock: false,
      ...opts,
    });

  it('aktif ilan: teklif açık; takas yalnız takasa açıksa', () => {
    expect(avail()).toEqual({ offer: true, trade: false, tradeBadge: false });
    expect(avail({ tradeAvailable: true })).toEqual({ offer: true, trade: true, tradeBadge: true });
  });

  it('sahipte teklif/takas kapalı; takas rozeti sahibe de görünür', () => {
    expect(avail({ tradeAvailable: true }, { isOwner: true })).toEqual({ offer: false, trade: false, tradeBadge: true });
  });

  it('satıldı / rezerve / stok bitti: ikisi de kapalı (web: aktif değilse teklif/takas yok)', () => {
    expect(avail({ status: 'sold', tradeAvailable: true })).toEqual({ offer: false, trade: false, tradeBadge: false });
    expect(avail({ status: 'reserved' })).toEqual({ offer: false, trade: false, tradeBadge: false });
    expect(avail({ availableQuantity: 0 }, { isOutOfStock: true })).toEqual({ offer: false, trade: false, tradeBadge: false });
  });
});

describe('alt bardaki teklif/takas satırı', () => {
  const row = (availability: { offer: boolean; trade: boolean }, props: Record<string, unknown> = {}) =>
    render(
      <ProductOfferTradeRow
        availability={{ ...availability, tradeBadge: availability.trade }}
        onTrade={noop}
        onMakeOffer={noop}
        {...props}
      />,
    );
  const flat = (id: string) => Object.assign({}, ...[screen.getByTestId(id).props.style].flat());

  it('ikisi de geçerliyse eşit genişlikte yan yana: Takas Teklifi · Teklif Ver', () => {
    row({ offer: true, trade: true });
    expect(screen.getByText('Takas Teklifi')).toBeTruthy();
    expect(screen.getByText('Teklif Ver')).toBeTruthy();
    expect(flat('product-detail-trade-button').flex).toBe(1);
    expect(flat('product-detail-offer-button').flex).toBe(1);
    expect(screen.getByText('Takas Teklifi').props.numberOfLines).toBe(1);
  });

  it('yalnız teklif: tek düğme tam genişlik', () => {
    row({ offer: true, trade: false });
    expect(screen.queryByTestId('product-detail-trade-button')).toBeNull();
    expect(flat('product-detail-offer-button').flex).toBe(1);
  });

  it('hiçbiri geçerli değilse satır çizilmez', () => {
    row({ offer: false, trade: false });
    expect(screen.queryByTestId('product-offer-trade-row')).toBeNull();
  });

  it('düğmeler ilgili akışı açar', () => {
    const onTrade = jest.fn();
    const onMakeOffer = jest.fn();
    row({ offer: true, trade: true }, { onTrade, onMakeOffer });
    fireEvent.press(screen.getByTestId('product-detail-trade-button'));
    fireEvent.press(screen.getByTestId('product-detail-offer-button'));
    expect(onTrade).toHaveBeenCalledTimes(1);
    expect(onMakeOffer).toHaveBeenCalledTimes(1);
  });
});

describe('içerik eylem satırı', () => {
  const secondary = (over: Record<string, unknown> = {}, props: Record<string, unknown> = {}) =>
    render(
      <ProductSecondaryActions
        product={{ ...base, ...over } as any}
        isOwner={false}
        inCart={false}
        quantity={1}
        onQuantity={noop}
        onAddToCollection={noop}
        {...props}
      />,
    );

  it('adet seçici yalnız stok>1 ilanda; teklif/takas burada yok (alt barda)', () => {
    const { unmount } = secondary({ tradeAvailable: true });
    expect(screen.getByLabelText('Adedi arttır')).toBeTruthy();
    expect(screen.queryByText('Teklif Ver')).toBeNull();
    expect(screen.queryByText('Takas Teklifi')).toBeNull();
    unmount();
    secondary({ availableQuantity: 1 });
    expect(screen.queryByLabelText('Adedi arttır')).toBeNull();
  });

  it('ürün sepetteyse adet seçici gizli (bar "Sepete Git"; Hemen Al sepet adedini öder)', () => {
    secondary({}, { inCart: true });
    expect(screen.queryByLabelText('Adedi arttır')).toBeNull();
  });

  it('sahipte yalnız Koleksiyona Ekle', () => {
    const onAddToCollection = jest.fn();
    secondary({}, { isOwner: true, onAddToCollection });
    fireEvent.press(screen.getByText('Koleksiyona Ekle'));
    expect(onAddToCollection).toHaveBeenCalled();
  });
});

describe('durum uyarısı', () => {
  const t = i18n.t.bind(i18n) as any;
  it('aktif ve stokta: uyarı yok', () => {
    expect(getProductNotice(base as any, t)).toBeNull();
  });
  it('statü aktif değilse statü, aktif ama stok 0 ise "stok bitti"', () => {
    expect(getProductNotice({ ...base, status: 'reserved' } as any, t)?.variant).toBe('warning');
    expect(getProductNotice({ ...base, status: 'sold' } as any, t)?.variant).toBe('danger');
    const out = getProductNotice({ ...base, availableQuantity: 0 } as any, t);
    expect(out?.title).toBe('Stok bitti');
    expect(out?.subtitle).toBe('Bu ürünün stoğu tükendi, şu anda satın alınamaz.');
  });
});
