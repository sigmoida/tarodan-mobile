/**
 * Tek ProductCard (web `ProductCard` telefon görünümü): fiyat/indirim/stok türetmesi, rozetler,
 * meta satırı, liste varyantı, seçim ve tıklama kaydı.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProductCard } from '../ProductCard';
import { Text } from '@/ui';
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

  /** Görünür rozet metinlerini ağaç sırasıyla (yukarıdan aşağı) verir. */
  const badgeOrder = (labels: string[]) => {
    const json = JSON.stringify(screen.toJSON());
    // `%{discount}` iki çocuk (`"%","20"`) olarak üretilir.
    const token = (l: string) => (l.startsWith('%') ? `"%","${l.slice(1)}"` : `"${l}"`);
    return labels.filter((l) => json.includes(token(l))).sort((a, b) => json.indexOf(token(a)) - json.indexOf(token(b)));
  };
  const LABELS = ['%20', 'Sponsorlu', 'Takas', 'Kargo Bedava'];
  const all = { ...base, price: 80, oldPrice: 100, isBoosted: true, tradeAvailable: true, feeCampaigns: ['Kargo Bedava'] };

  it('rozetler: indirim + sponsorlu + takas + kampanya → ilk 2: %indirim, Sponsorlu (sol üst yığın, bu sırada)', () => {
    render(<ProductCard product={all as never} />);
    expect(badgeOrder(LABELS)).toEqual(['%20', 'Sponsorlu']);
    expect(screen.queryByText('Takas')).toBeNull();
    expect(screen.queryByText('Kargo Bedava')).toBeNull();
  });

  it('rozetler: indirim her zaman ilk; sponsorlu yoksa indirim + takas', () => {
    render(<ProductCard product={{ ...all, isBoosted: false } as never} />);
    expect(badgeOrder(LABELS)).toEqual(['%20', 'Takas']);
  });

  it('rozetler: indirim + kampanya (sponsorlu, takas yok) → %indirim, kampanya', () => {
    render(<ProductCard product={{ ...all, isBoosted: false, tradeAvailable: false } as never} />);
    expect(badgeOrder(LABELS)).toEqual(['%20', 'Kargo Bedava']);
  });

  it('rozetler: indirim yoksa sponsorlu, takas (kampanya 3. olduğu için kesilir)', () => {
    render(<ProductCard product={{ ...all, oldPrice: undefined } as never} />);
    expect(badgeOrder(LABELS)).toEqual(['Sponsorlu', 'Takas']);
    expect(screen.queryByText('Kargo Bedava')).toBeNull();
  });

  it('indirim rozeti sol üst yığında (sağ üstte ayrı rozet yok): yığın kalbe yer bırakır', () => {
    render(<ProductCard product={{ ...base, price: 80, oldPrice: 100 }} />);
    let node = screen.getByText('%20').parent;
    while (node && !String(JSON.stringify(node.props.style ?? null)).includes('"left"')) node = node.parent;
    const style = JSON.stringify(node?.props.style);
    expect(style).toContain('"top":6');
    expect(style).toContain('"left":6');
    // Web: left-1.5 + max-w calc(100% - 3.25rem) → sağdan 46pt (kalp inset 6 + kalp 32 + 8).
    expect(style).toContain('"right":46');
  });

  it('sponsorlu yalnız isBoosted === true ile (boostedUntil tek başına rozet açmaz)', () => {
    render(<ProductCard product={{ ...base, boostedUntil: '2099-01-01T00:00:00Z' } as never} />);
    expect(screen.queryByText('Sponsorlu')).toBeNull();
  });

  it('indirim yüzdesi < 1 ise rozet çıkmaz (asla "%0")', () => {
    render(<ProductCard product={{ ...base, price: 99.9, oldPrice: 100 }} />);
    expect(screen.queryByText(/^%/)).toBeNull();
  });

  it('tradeAvailable=false eski alanları ezer: takas rozeti yok', () => {
    render(<ProductCard product={{ ...base, tradeAvailable: false, isTradeEnabled: true } as never} />);
    expect(screen.queryByText('Takas')).toBeNull();
  });

  it('erişilebilirlik: kart etiketi görünen rozetleri sırayla ekler (grid)', () => {
    render(<ProductCard product={all as never} />);
    expect(screen.getByLabelText('Hot Wheels Supra, %20 İndirim, Sponsorlu')).toBeTruthy();
  });

  it('erişilebilirlik: liste etiketi indirim + takas ikonunu içerir', () => {
    render(<ProductCard layout="list" product={all as never} />);
    expect(screen.getByLabelText('Hot Wheels Supra, %20 İndirim, Takas')).toBeTruthy();
  });

  it('erişilebilirlik: rozet yoksa etiket yalnız başlık', () => {
    render(<ProductCard product={base} />);
    expect(screen.getByLabelText('Hot Wheels Supra')).toBeTruthy();
  });

  it('overlayStart verilince sol üst rozet yığını çizilmez (çakışma yok)', () => {
    render(
      <ProductCard
        product={all as never}
        overlayStart={<Text>seçim</Text>}
      />,
    );
    expect(screen.getByText('seçim')).toBeTruthy();
    expect(screen.queryByText('%20')).toBeNull();
    expect(screen.queryByText('Sponsorlu')).toBeNull();
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

  it('"Sepette" rozeti kartta yok (web kartında yok); onToggleFavorite verilmezse kalp de yok', () => {
    render(<ProductCard product={base} />);
    expect(screen.queryByTestId('product-card-favorite-p1')).toBeNull();
    expect(screen.queryByLabelText(/favori/i)).toBeNull();
    expect(screen.queryByText(/sepette/i)).toBeNull();
  });
});

describe('ProductCard — favori kalbi', () => {
  beforeEach(() => jest.clearAllMocks());

  /** Liste düzeninde kalp görselin ölçülen çerçevesine oturur: testte ölçümü taklit et. */
  function layoutListImage() {
    const img = screen.UNSAFE_root.findAll(
      (n: { props: { onLayout?: unknown; style?: unknown } }) =>
        typeof n.props.onLayout === 'function' && String(JSON.stringify(n.props.style ?? null)).includes('"width":80'),
    )[0]!;
    fireEvent(img, 'layout', { nativeEvent: { layout: { x: 13, y: 20, width: 80, height: 80 } } });
  }

  it.each(['grid', 'list'] as const)('%s: etiket ürün adıyla, pasif; basınca toggle(id), kart AÇILMAZ', (layout) => {
    const onToggle = jest.fn();
    render(<ProductCard product={base} layout={layout} onToggleFavorite={onToggle} />);
    if (layout === 'list') {
      // Ölçüm gelmeden çizilmez (ilk karede yanlış yerde görünüp zıplamasın).
      expect(screen.queryByTestId('product-card-favorite-p1')).toBeNull();
      layoutListImage();
    }
    const heart = screen.getByTestId('product-card-favorite-p1');
    expect(heart.props.accessibilityLabel).toBe('Hot Wheels Supra — Favori');
    expect(heart.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
    fireEvent.press(heart);
    expect(onToggle).toHaveBeenCalledWith('p1');
    expect(mockPush).not.toHaveBeenCalled();
    expect(productsApi.recordClick).not.toHaveBeenCalled();
  });

  /** Kalbin kutusu: GlassIconButton'ın atası — konum stilini taşıyan ilk düğüm. */
  const heartBoxStyle = (key: 'left' | 'right') => {
    let node = screen.getByTestId('product-card-favorite-p1').parent;
    while (node && !String(JSON.stringify(node.props.style ?? null)).includes(`"${key}"`)) node = node.parent;
    return JSON.stringify(node?.props.style);
  };

  it('liste: kalp ölçülen görselin sağ üstüne oturur', () => {
    render(<ProductCard product={base} layout="list" onToggleFavorite={jest.fn()} />);
    layoutListImage();
    // Web top-1.5 right-1.5: 13 + 80 - 32 - 6 = 55; 20 + 6 = 26
    expect(heartBoxStyle('left')).toContain('"left":55');
    expect(heartBoxStyle('left')).toContain('"top":26');
  });

  it('grid: kalp görselin sağ üst köşesinde (alt değil)', () => {
    render(<ProductCard product={base} onToggleFavorite={jest.fn()} />);
    const style = heartBoxStyle('right');
    expect(style).toContain('"right":6');
    expect(style).toContain('"top":6');
    expect(style).not.toContain('"bottom"');
  });

  it('grid: overlay (görselin sağ üst yuvası) verilince kalp çizilmez, overlay kalır', () => {
    render(<ProductCard product={base} onToggleFavorite={jest.fn()} overlay={<Text>kaldır</Text>} />);
    expect(screen.queryByTestId('product-card-favorite-p1')).toBeNull();
    expect(screen.getByText('kaldır')).toBeTruthy();
  });

  it('liste: overlay satırın sağ üstündedir (görselde değil) — kalbi gizlemez', () => {
    render(<ProductCard product={base} layout="list" onToggleFavorite={jest.fn()} overlay={<Text>seç</Text>} />);
    layoutListImage();
    expect(screen.getByTestId('product-card-favorite-p1')).toBeTruthy();
    expect(screen.getByText('seç')).toBeTruthy();
  });

  it('aktif: aynı etiket, durum seçili', () => {
    render(<ProductCard product={base} isFavorite onToggleFavorite={jest.fn()} />);
    const heart = screen.getByLabelText('Hot Wheels Supra — Favori');
    expect(heart.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  });

  it('kalp varken kartın kendisine basmak yine ürünü açar', () => {
    const onToggle = jest.fn();
    render(<ProductCard product={base} onToggleFavorite={onToggle} />);
    fireEvent.press(screen.getByText('Hot Wheels Supra'));
    expect(mockPush).toHaveBeenCalledWith('/product/p1');
    expect(onToggle).not.toHaveBeenCalled();
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

  it('liste: takas ikonu görselin SOL üstünde (sağ üst kalbe ayrılmış), indirim fiyatın yanında', () => {
    render(<ProductCard layout="list" product={{ ...base, price: 80, oldPrice: 100, tradeAvailable: true } as never} />);
    let node = screen.getByLabelText('Takas').parent;
    while (node && !String(JSON.stringify(node.props.style ?? null)).includes('"position":"absolute"')) node = node.parent;
    const style = JSON.stringify(node?.props.style);
    expect(style).toContain('"left":4');
    expect(style).not.toContain('"right"');
    // Sponsorlu/kampanya listede yok.
    expect(screen.queryByText('Sponsorlu')).toBeNull();
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
