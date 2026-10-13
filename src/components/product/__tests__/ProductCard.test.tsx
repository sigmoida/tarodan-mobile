/**
 * Tek ProductCard (web `ProductCard` telefon görünümü): fiyat/indirim/stok türetmesi, rozetler,
 * meta satırı, liste varyantı, seçim ve tıklama kaydı.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProductCard } from '../ProductCard';
import { productsApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

const base = { id: 'p1', title: 'Hot Wheels Supra', price: 100, images: [] };

describe('ProductCard — grid', () => {
  beforeEach(() => jest.clearAllMocks());

  it('başlık ve fiyatı "1.234,50 TL" biçiminde basar; indirim yoksa eski fiyat/rozet yok', () => {
    render(<ProductCard product={{ ...base, price: 1234.5 }} />);
    expect(screen.getByText('Hot Wheels Supra')).toBeTruthy();
    expect(screen.getByTestId('product-card-price').props.children).toBe('1.234,50 TL');
    expect(screen.queryByTestId('product-card-old-price')).toBeNull();
    expect(screen.queryByText(/^%/)).toBeNull();
  });

  it('indirimde eski fiyat çizili + %yüzde rozeti (oldPrice, originalPrice önüne geçer)', () => {
    render(<ProductCard product={{ ...base, price: 75, oldPrice: 100, originalPrice: 200 }} />);
    expect(screen.getByTestId('product-card-price').props.children).toBe('75,00 TL');
    const old = screen.getByTestId('product-card-old-price');
    expect(old.props.children).toBe('100,00 TL');
    expect(JSON.stringify(old.props.style)).toContain('line-through');
    expect(screen.getByText('%25')).toBeTruthy();
  });

  it('API discountPercent verirse onu gösterir', () => {
    render(<ProductCard product={{ ...base, price: 70, oldPrice: 100, discountPercent: 30 }} />);
    expect(screen.getByText('%30')).toBeTruthy();
  });

  it('eski fiyat güncelden yüksek değilse indirim gösterilmez', () => {
    render(<ProductCard product={{ ...base, price: 100, oldPrice: 100 }} />);
    expect(screen.queryByTestId('product-card-old-price')).toBeNull();
    expect(screen.queryByText(/^%/)).toBeNull();
  });

  it('stokta yok: "STOKTA YOK" katmanı; stokta ise yok', () => {
    const { rerender } = render(<ProductCard product={{ ...base, status: 'sold' }} />);
    expect(screen.getByText('STOKTA YOK')).toBeTruthy();
    rerender(<ProductCard product={{ ...base, status: 'active', availableQuantity: 0 }} />);
    expect(screen.getByText('STOKTA YOK')).toBeTruthy();
    rerender(<ProductCard product={{ ...base, status: 'active', availableQuantity: null }} />);
    expect(screen.queryByText('STOKTA YOK')).toBeNull();
  });

  it('rozetler: en çok 2 — öncelik sponsorlu > takas > bedel kampanyası', () => {
    render(
      <ProductCard product={{ ...base, isBoosted: true, tradeAvailable: true, feeCampaigns: ['Kargo Bedava', 'Diğer'] } as never} />,
    );
    expect(screen.getByText('Sponsorlu')).toBeTruthy();
    expect(screen.getByText('Takas')).toBeTruthy();
    expect(screen.queryByText('Kargo Bedava')).toBeNull();
    expect(screen.queryByText('Diğer')).toBeNull();
  });

  it('rozetler: sponsorlu yoksa takas + bedel kampanyası (yalnız ilki) görünür', () => {
    render(<ProductCard product={{ ...base, tradeAvailable: true, feeCampaigns: ['Kargo Bedava', 'Diğer'] } as never} />);
    expect(screen.queryByText('Sponsorlu')).toBeNull();
    expect(screen.getByText('Takas')).toBeTruthy();
    expect(screen.getByText('Kargo Bedava')).toBeTruthy();
    expect(screen.queryByText('Diğer')).toBeNull();
  });

  it('rozet etiketi tek satır: uzun kampanya metni ellipsis ile kırpılır', () => {
    render(<ProductCard product={{ ...base, feeCampaigns: ['Çok uzun bir kampanya adı burada yer alıyor'] } as never} />);
    expect(screen.getByText('Çok uzun bir kampanya adı burada yer alıyor').props.numberOfLines).toBe(1);
  });

  it('meta satırı: puan (varsa), beğeni, görüntülenme; showMeta=false ile gizlenir', () => {
    const product = { ...base, likeCount: 7, viewCount: 42, rating: { average: 4.5, count: 3 } };
    const { rerender } = render(<ProductCard product={product} />);
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('(3)')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    rerender(<ProductCard product={product} showMeta={false} />);
    expect(screen.queryByText('42')).toBeNull();
    expect(screen.queryByText('4.5')).toBeNull();
  });

  it('puanı olmayan üründe puan gizli, beğeni/görüntülenme 0 gösterilir', () => {
    render(<ProductCard product={base} />);
    expect(screen.queryByText('(0)')).toBeNull();
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('favori kalbi ve "Sepette" rozeti kartta yok (web kartında yok)', () => {
    render(<ProductCard product={base} />);
    expect(screen.queryByLabelText(/favori/i)).toBeNull();
    expect(screen.queryByText(/sepette/i)).toBeNull();
  });
});

describe('ProductCard — tıklama', () => {
  beforeEach(() => jest.clearAllMocks());

  it('basınca tıklama kaydedilir ve ürün açılır', () => {
    render(<ProductCard product={base} />);
    fireEvent.press(screen.getByText('Hot Wheels Supra'));
    expect(productsApi.recordClick).toHaveBeenCalledWith('p1');
    expect(mockPush).toHaveBeenCalledWith('/product/p1');
  });

  it('onPress verilirse o çalışır (yine de tıklama kaydedilir); gezinme yapılmaz', () => {
    const onPress = jest.fn();
    render(<ProductCard product={base} onPress={onPress} />);
    fireEvent.press(screen.getByText('Hot Wheels Supra'));
    expect(onPress).toHaveBeenCalled();
    expect(productsApi.recordClick).toHaveBeenCalledWith('p1');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('trackClick=false: kayıt yok (seçim listesi)', () => {
    const onPress = jest.fn();
    render(<ProductCard product={base} onPress={onPress} trackClick={false} />);
    fireEvent.press(screen.getByText('Hot Wheels Supra'));
    expect(onPress).toHaveBeenCalled();
    expect(productsApi.recordClick).not.toHaveBeenCalled();
  });

  it('takip başarısız olsa bile gezinme çalışır', () => {
    (productsApi.recordClick as jest.Mock).mockRejectedValueOnce(new Error('ağ'));
    render(<ProductCard product={base} />);
    fireEvent.press(screen.getByText('Hot Wheels Supra'));
    expect(mockPush).toHaveBeenCalledWith('/product/p1');
  });
});

describe('ProductCard — liste ve slotlar', () => {
  it('liste: başlık, açıklama (showMeta), fiyat, indirimde eski fiyat + rozet; takas rozeti yalnız ikon', () => {
    render(
      <ProductCard
        layout="list"
        product={{ ...base, price: 80, oldPrice: 100, description: 'Güzel araba', tradeAvailable: true } as never}
      />,
    );
    expect(screen.getByText('Hot Wheels Supra')).toBeTruthy();
    expect(screen.getByText('Güzel araba')).toBeTruthy();
    expect(screen.getByTestId('product-card-price').props.children).toBe('80,00 TL');
    expect(screen.getByTestId('product-card-old-price').props.children).toBe('100,00 TL');
    expect(screen.getByText('%20')).toBeTruthy();
    // Telefonda liste görünümünde takas rozeti yalnız ikon (web `hidden sm:inline` etiket).
    expect(screen.queryByText('Takas')).toBeNull();
    expect(screen.getByLabelText('Takas')).toBeTruthy();
  });

  it('liste showMeta=false: açıklama ve meta yok', () => {
    render(<ProductCard layout="list" showMeta={false} product={{ ...base, description: 'Güzel araba' }} />);
    expect(screen.queryByText('Güzel araba')).toBeNull();
  });

  it('overlay / overlayStart / footer slotları kart dokunuşunun dışında çizilir', () => {
    const { Text } = require('react-native');
    render(
      <ProductCard
        product={base}
        overlay={<Text>OVR</Text>}
        overlayStart={<Text>OVS</Text>}
        footer={<Text>FTR</Text>}
      />,
    );
    expect(screen.getByText('OVR')).toBeTruthy();
    expect(screen.getByText('OVS')).toBeTruthy();
    expect(screen.getByText('FTR')).toBeTruthy();
  });

  it('seçili: erişilebilirlik durumu selected', () => {
    render(<ProductCard product={base} selected />);
    expect(screen.getByRole('button', { name: 'Hot Wheels Supra' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
  });
});
