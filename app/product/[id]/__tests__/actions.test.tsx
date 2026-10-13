/**
 * Ürün detayı CTA'ları (web `ProductInfo`): etiketler web ile aynı, adet seçici yalnız stoğu 1'den
 * fazla ilanda, sepet düğmesi sepete ekle/çıkar arasında geçer, sahibe düzenle.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProductBuyBar, ProductSecondaryActions, quantityLimit } from '../_components/ProductActions';
import { getProductNotice } from '../_lib/notice';
import i18n from '@/i18n/config';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => ({ showTradeEntry: true, showCollectionEntry: true }),
}));

const base = { id: 'p1', title: 'Model', price: 100, status: 'active', availableQuantity: 5, images: [] };
const noop = () => undefined;

function bar(over: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
  return render(
    <ProductBuyBar
      product={{ ...base, ...over } as any}
      isOwner={false}
      isOutOfStock={false}
      quantity={1}
      onQuantity={noop}
      onBuyNow={noop}
      onEdit={noop}
      onAddToCollection={noop}
      {...props}
    />,
  );
}

describe('alt bar (Hemen Al)', () => {
  it('stokta: "Hemen Al" + adet seçici (stok>1)', () => {
    bar();
    expect(screen.getByText('Hemen Al')).toBeTruthy();
    expect(screen.getByLabelText('Adedi arttır')).toBeTruthy();
  });

  it('tek stokta adet seçici yok', () => {
    bar({ availableQuantity: 1 });
    expect(screen.queryByLabelText('Adedi arttır')).toBeNull();
  });

  it('adet seçici tavanı: müsait stok ve 20 sınırı', () => {
    expect(quantityLimit(base as any, false)).toBe(5);
    expect(quantityLimit({ ...base, availableQuantity: 50 } as any, false)).toBe(20);
    expect(quantityLimit({ ...base, availableQuantity: 5 } as any, true)).toBeNull();
    expect(quantityLimit({ ...base, status: 'sold' } as any, false)).toBeNull();
  });

  it('web etiketleri: Satıldı / Rezerve Edildi / Stok bitti, düğme pasif', () => {
    const { rerender } = bar({ status: 'sold' }, { isOutOfStock: true });
    expect(screen.getByText('Satıldı')).toBeTruthy();
    expect(screen.getByTestId('product-detail-out-of-stock-button').props.accessibilityState?.disabled).toBe(true);
    rerender(
      <ProductBuyBar
        product={{ ...base, status: 'reserved' } as any}
        isOwner={false}
        isOutOfStock
        quantity={1}
        onQuantity={noop}
        onBuyNow={noop}
        onEdit={noop}
        onAddToCollection={noop}
      />,
    );
    expect(screen.getByText('Rezerve Edildi')).toBeTruthy();
    rerender(
      <ProductBuyBar
        product={{ ...base, availableQuantity: 0 } as any}
        isOwner={false}
        isOutOfStock
        quantity={1}
        onQuantity={noop}
        onBuyNow={noop}
        onEdit={noop}
        onAddToCollection={noop}
      />,
    );
    expect(screen.getByText('Stok bitti')).toBeTruthy();
  });

  it('basınca onBuyNow çalışır', () => {
    const onBuyNow = jest.fn();
    bar({}, { onBuyNow });
    fireEvent.press(screen.getByText('Hemen Al'));
    expect(onBuyNow).toHaveBeenCalled();
  });

  it('sahip: Düzenle + Koleksiyona Ekle, satın alma yok', () => {
    const onEdit = jest.fn();
    bar({}, { isOwner: true, onEdit });
    expect(screen.queryByText('Hemen Al')).toBeNull();
    expect(screen.getByText('Koleksiyona Ekle')).toBeTruthy();
    fireEvent.press(screen.getByText('Düzenle'));
    expect(onEdit).toHaveBeenCalled();
  });
});

describe('ikincil CTA satırı', () => {
  const secondary = (over: Record<string, unknown> = {}, props: Record<string, unknown> = {}) =>
    render(
      <ProductSecondaryActions
        product={{ ...base, ...over } as any}
        isOwner={false}
        inCart={false}
        onTrade={noop}
        onMakeOffer={noop}
        onCartToggle={noop}
        {...props}
      />,
    );

  it('takasa açıksa Takas Teklifi · Teklif Ver · Sepete Ekle', () => {
    secondary({ tradeAvailable: true });
    expect(screen.getByText('Takas Teklifi')).toBeTruthy();
    expect(screen.getByText('Teklif Ver')).toBeTruthy();
    expect(screen.getByText('Sepete Ekle')).toBeTruthy();
  });

  it('takasa kapalıysa Takas Teklifi yok', () => {
    secondary();
    expect(screen.queryByText('Takas Teklifi')).toBeNull();
  });

  it('sepetteyse "Sepetten Çıkar"; basınca onCartToggle', () => {
    const onCartToggle = jest.fn();
    secondary({}, { inCart: true, onCartToggle });
    fireEvent.press(screen.getByText('Sepetten Çıkar'));
    expect(onCartToggle).toHaveBeenCalled();
  });

  it('ilan aktif değilse düğmeler pasif', () => {
    secondary({ status: 'sold' });
    expect(screen.getByTestId('product-detail-offer-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('sahipte hiç çizilmez', () => {
    secondary({}, { isOwner: true });
    expect(screen.queryByText('Teklif Ver')).toBeNull();
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
