import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { brandFontStyle, bodyLetterSpacing, normalizeFontWeight } from '@/theme';
import { BrandFontProvider, RawText, Text } from '@/ui';

const styleOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

describe('font eşlemesi (src/theme/typography.ts)', () => {
  it('ağırlığı yüklenen 4 Noto Sans dosyasından birine indirger', () => {
    expect(normalizeFontWeight(undefined)).toBe(400);
    expect(normalizeFontWeight('normal')).toBe(400);
    expect(normalizeFontWeight('300')).toBe(400);
    expect(normalizeFontWeight('500')).toBe(500);
    expect(normalizeFontWeight(600)).toBe(600);
    expect(normalizeFontWeight('bold')).toBe(700);
    expect(normalizeFontWeight('800')).toBe(700);
  });

  it('font hazır değilse ya da stil kendi ailesini taşıyorsa dokunmaz', () => {
    expect(brandFontStyle(false, '700')).toBeNull();
    expect(brandFontStyle(true, '700', 'Courier')).toBeNull();
    expect(brandFontStyle(true, '600')).toEqual({
      fontFamily: 'NotoSans_600SemiBold',
      fontWeight: 'normal',
    });
  });

  it('gövde harf aralığı web -0.01em', () => {
    expect(bodyLetterSpacing(true, 16)).toBe(-0.16);
    expect(bodyLetterSpacing(false, 16)).toBeUndefined();
  });
});

describe('Text / RawText marka fontu', () => {
  it('sağlayıcı yokken (test, yükleme hatası) stil değişmez', () => {
    render(<Text weight="bold">Merhaba</Text>);
    const s = styleOf('Merhaba');
    expect(s.fontFamily).toBeUndefined();
    expect(s.fontWeight).toBe('700');
  });

  it('font hazırken ağırlık doğru dosyaya eşlenir', () => {
    render(
      <BrandFontProvider ready>
        <Text weight="semibold">Başlık</Text>
        <RawText style={{ fontSize: 12 }}>Ham</RawText>
        <RawText style={{ fontFamily: 'Courier' }}>Kod</RawText>
      </BrandFontProvider>,
    );
    expect(styleOf('Başlık')).toMatchObject({
      fontFamily: 'NotoSans_600SemiBold',
      fontWeight: 'normal',
      letterSpacing: -0.16,
    });
    expect(styleOf('Ham')).toMatchObject({
      fontFamily: 'NotoSans_400Regular',
      letterSpacing: -0.12,
    });
    expect(styleOf('Kod').fontFamily).toBe('Courier');
  });

  it('iç içe düz metin ebeveynin kalınlığını korur', () => {
    render(
      <BrandFontProvider ready>
        <RawText style={{ fontWeight: '700' }}>
          Toplam <RawText style={{ color: 'red' }}>iç</RawText>
        </RawText>
      </BrandFontProvider>,
    );
    expect(styleOf('iç').fontFamily).toBe('NotoSans_700Bold');
  });

  it('italik stil marka ailesini almaz (sistem fontunda italik kalır), ağırlık da bozulmaz', () => {
    expect(brandFontStyle(true, '400', undefined, 'italic')).toBeNull();
    expect(brandFontStyle(true, '400', undefined, 'normal')).not.toBeNull();
    render(
      <BrandFontProvider ready>
        <RawText style={{ fontStyle: 'italic', fontWeight: '700' }}>
          Eğik <RawText style={{ color: 'red' }}>iç</RawText>
        </RawText>
        <Text style={{ fontStyle: 'italic' }}>Eğik2</Text>
      </BrandFontProvider>,
    );
    const outer = StyleSheet.flatten(screen.getAllByText(/Eğik/)[0].props.style);
    expect(outer.fontFamily).toBeUndefined();
    expect(outer.fontStyle).toBe('italic');
    expect(outer.fontWeight).toBe('700');
    // iç içe metin ebeveynin italiğini miras alır → o da marka ailesine geçmez
    expect(styleOf('iç').fontFamily).toBeUndefined();
    expect(styleOf('Eğik2').fontFamily).toBeUndefined();
  });
});
