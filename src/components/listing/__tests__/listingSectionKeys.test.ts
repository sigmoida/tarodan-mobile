/**
 * `memoSection` kilidi: her memo'lu bölümün karşılaştırma anahtarları (`fKeys`), dosyasında
 * okunan HER `f.<alan>`ı kapsamalı. Eksik anahtar = o alan değişince bölüm yeniden çizilmez →
 * bayat değer ya da bayat closure (ör. eski `handleSubmit`). Kaynak taranır; yeni bir `f.x`
 * erişimi eklenip `KEYS`'e yazılmazsa bu test kırılır.
 */
import fs from 'fs';
import path from 'path';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

import { ListingBasicInfoSection } from '../_sections/ListingBasicInfoSection';
import { ListingDetailsSection } from '../_sections/ListingDetailsSection';
import {
  ListingGlobalAttributesSection,
  ListingManufacturerAttributesSection,
} from '../_sections/ListingAttributeSections';
import { ListingHeaderBanners } from '../_sections/ListingHeaderBanners';
import { ListingImagesSection } from '../_sections/ListingImagesSection';
import { ListingOptionsSection } from '../_sections/ListingOptionsSection';
import { ListingPricingSection } from '../_sections/ListingPricingSection';
import { ListingShippingSection } from '../_sections/ListingShippingSection';
import { ListingSubmitBar, ListingRemovalOverlay } from '../_sections/ListingSubmitBar';
import { ListingPickers } from '../_components/ListingPickers';

type Memoized = { fKeys: readonly string[] };

const FILES: [string, Memoized[]][] = [
  ['_sections/ListingBasicInfoSection.tsx', [ListingBasicInfoSection]],
  ['_sections/ListingDetailsSection.tsx', [ListingDetailsSection]],
  [
    '_sections/ListingAttributeSections.tsx',
    [ListingGlobalAttributesSection, ListingManufacturerAttributesSection],
  ],
  ['_sections/ListingHeaderBanners.tsx', [ListingHeaderBanners]],
  ['_sections/ListingImagesSection.tsx', [ListingImagesSection]],
  ['_sections/ListingOptionsSection.tsx', [ListingOptionsSection]],
  ['_sections/ListingPricingSection.tsx', [ListingPricingSection]],
  ['_sections/ListingShippingSection.tsx', [ListingShippingSection]],
  ['_sections/ListingSubmitBar.tsx', [ListingSubmitBar, ListingRemovalOverlay]],
  ['_components/ListingPickers.tsx', [ListingPickers]],
];

describe('memoSection anahtarları dosyadaki tüm f.<alan> erişimlerini kapsar', () => {
  it.each(FILES)('%s', (rel, components) => {
    const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    const used = new Set(Array.from(src.matchAll(/\bf\.([A-Za-z_]\w*)/g), (m) => m[1]));
    expect(used.size).toBeGreaterThan(0);
    const declared = new Set(components.flatMap((c) => c.fKeys));
    const missing = [...used].filter((k) => !declared.has(k));
    expect(missing).toEqual([]);
  });
});
