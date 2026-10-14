/**
 * İlan formu fiyatlandırma — web `PricingCard` / `PackageSizePicker` / `OptionsCard` paritesi:
 * özet kutusu iki satır (Kargo ücreti + Hak edişiniz) ya da kural-yok hatası, kademe
 * kartlarında "Paket ücreti" şeridi (…, —, tutar) + eksik girdi ipucu, ileri tarihli indirim
 * ipucu ve gizli Set/Paket anahtarı.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { ListingPricingSection } from '../_sections/ListingPricingSection';
import { ListingShippingSection } from '../_sections/ListingShippingSection';
import { ListingOptionsSection } from '../_sections/ListingOptionsSection';
import type { ListingFormController } from '../_hooks/useListingForm';

const asF = (o: Record<string, unknown>) => o as unknown as ListingFormController;

const PREVIEW = {
  sellerFeeAmount: 25,
  withholdingTaxAmount: 1,
  shippingAmount: 50,
  sellerNetAmount: 424,
  packageTierShipping: [
    { code: 'small', sellerShippingAmount: 50 },
    { code: 'medium', sellerShippingAmount: 65 },
  ],
};

function pricingF(over: Record<string, unknown> = {}) {
  return asF({
    isEdit: false,
    price: '500',
    setPrice: jest.fn(),
    quantity: '1',
    setQuantity: jest.fn(),
    reservedQty: 0,
    salePrice: '',
    setSalePrice: jest.fn(),
    saleStartDate: '2026-10-14',
    setSaleStartDate: jest.fn(),
    saleEndDate: '2026-10-21',
    setSaleEndDate: jest.fn(),
    discountPercent: 0,
    saleStartsOn: null,
    commissionPreview: null,
    commissionLoading: false,
    commissionError: false,
    commissionEnabled: true,
    ...over,
  });
}

describe('Fiyatlandırma özeti (web PricingBreakdown)', () => {
  it('iki satır: Kargo ücreti ve Hak edişiniz', () => {
    render(<ListingPricingSection f={pricingF({ commissionPreview: PREVIEW })} />);
    const box = screen.getByTestId('commission-preview');
    expect(within(box).getByText('Tahmini (satış başına)')).toBeTruthy();
    expect(within(box).getByText('Kargo ücreti')).toBeTruthy();
    expect(within(box).getByText('50,00 TL')).toBeTruthy();
    expect(within(box).getByText('Hak edişiniz')).toBeTruthy();
    expect(within(box).getByText('424,00 TL')).toBeTruthy();
    expect(within(box).queryByText(/Platform kesintisi/)).toBeNull();
  });

  it('kargo payı 0 iken satır gizlenmez', () => {
    render(<ListingPricingSection f={pricingF({ commissionPreview: { ...PREVIEW, shippingAmount: 0 } })} />);
    expect(screen.getByText('Kargo ücreti')).toBeTruthy();
    expect(screen.getByText('0,00 TL')).toBeTruthy();
  });

  it('önizleme alınamazsa web hata metni', () => {
    render(<ListingPricingSection f={pricingF({ commissionError: true })} />);
    expect(screen.getByText(/aktif komisyon kuralı bulunamadığı/)).toBeTruthy();
    expect(screen.queryByText('Hak edişiniz')).toBeNull();
  });

  it('istenmemişse (fiyat/kategori eksik) kutu hiç çizilmez', () => {
    render(<ListingPricingSection f={pricingF({ commissionEnabled: false })} />);
    expect(screen.queryByTestId('commission-preview')).toBeNull();
  });

  it('indirim ileri tarihte başlıyorsa ipucu gösterilir', () => {
    render(<ListingPricingSection f={pricingF({ salePrice: '400', saleStartsOn: '2026-10-20' })} />);
    expect(screen.getByTestId('sale-starts-later')).toHaveTextContent('İndirim 20 Ekim 2026 tarihinde başlar.');
  });

  it('indirim bugün geçerliyse ipucu yok', () => {
    render(<ListingPricingSection f={pricingF({ salePrice: '400' })} />);
    expect(screen.queryByTestId('sale-starts-later')).toBeNull();
  });
});

const TIERS = [
  { code: 'small', label: 'Küçük Paket', sampleWidth: 20, sampleHeight: 10, sampleLength: 30 },
  { code: 'medium', label: 'Orta Paket', sampleWidth: null, sampleHeight: null, sampleLength: null },
];

function shippingF(over: Record<string, unknown> = {}) {
  return asF({
    packageTiersLoading: false,
    packageTiersError: false,
    packageTiers: TIERS,
    shippingPackageTier: 'small',
    setShippingPackageTier: jest.fn(),
    commissionPreview: null,
    commissionLoading: false,
    commissionEnabled: true,
    ...over,
  });
}

const fees = () => screen.getAllByTestId('package-tier-fee').map((n) => n.props.children);

describe('Kargo kademe kartları — Paket ücreti şeridi (web PackageSizeOption)', () => {
  it('tutar komisyon önizlemesinin packageTierShipping[]inden gelir', () => {
    render(<ListingShippingSection f={shippingF({ commissionPreview: PREVIEW })} />);
    expect(screen.getAllByText('Paket ücreti')).toHaveLength(2);
    expect(fees()).toEqual(['50,00 TL', '65,00 TL']);
    expect(screen.queryByTestId('package-fee-missing')).toBeNull();
  });

  it('hesaplanırken "…"', () => {
    render(<ListingShippingSection f={shippingF({ commissionLoading: true })} />);
    expect(fees()).toEqual(['…', '…']);
  });

  it('fiyat/kategori eksikse "—" + ipucu', () => {
    render(<ListingShippingSection f={shippingF({ commissionEnabled: false })} />);
    expect(fees()).toEqual(['—', '—']);
    expect(screen.getByTestId('package-fee-missing')).toHaveTextContent(
      'Paket ücretinizi görmek için fiyat ve kategori girin.',
    );
  });

  it('sunucu hatasında "—" ama eksik girdi ipucu YOK', () => {
    render(<ListingShippingSection f={shippingF({ commissionEnabled: true })} />);
    expect(fees()).toEqual(['—', '—']);
    expect(screen.queryByTestId('package-fee-missing')).toBeNull();
  });

  it('örnek ölçü varsa gösterilir, desi asla', () => {
    render(<ListingShippingSection f={shippingF()} />);
    expect(screen.getByText(/20 × 10 × 30 cm/)).toBeTruthy();
    expect(screen.queryByText(/desi/i)).toBeNull();
  });
});

describe('Seçenekler — Set/Paket gizli (web SET_BUNDLE_ENABLED=false)', () => {
  it('Set/Paket anahtarı ve parça sayısı çizilmez (isSet true olsa bile)', () => {
    render(
      <ListingOptionsSection
        f={asF({
          limits: { canTrade: true },
          isTradeEnabled: false,
          setIsTradeEnabled: jest.fn(),
          isSet: true,
          setIsSet: jest.fn(),
          bundleSize: '3',
          setBundleSize: jest.fn(),
          isEdit: false,
          status: 'active',
          setStatus: jest.fn(),
        })}
      />,
    );
    expect(screen.queryByText('Set / Paket')).toBeNull();
    expect(screen.queryByDisplayValue('3')).toBeNull();
    expect(screen.getByText('Takas Aktif')).toBeTruthy();
    expect(screen.queryByText('Set Parça Sayısı')).toBeNull();
  });
});
