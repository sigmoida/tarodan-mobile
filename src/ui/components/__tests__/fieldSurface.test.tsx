/**
 * Alan yüzeyi paritesi: Input, Select, DateField ve FieldTrigger kutusu AYNI görsel kuralı
 * (`fieldBoxStyle`) kullanır — zemin, çerçeve, radius, asgari yükseklik, durum renkleri.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { DateField, FieldTrigger, Input, Select, fieldBoxStyle, theme } from '@/ui';

const { colors, radiusRole } = theme;

const SURFACE_KEYS = [
  'backgroundColor',
  'borderColor',
  'borderWidth',
  'borderRadius',
  'minHeight',
  'paddingHorizontal',
  'paddingVertical',
] as const;

function pick(style: unknown) {
  const flat = StyleSheet.flatten(style as never) as Record<string, unknown>;
  return Object.fromEntries(SURFACE_KEYS.map((k) => [k, flat[k]]));
}

/** TextInput'tan yukarı çıkıp çerçeveyi (borderWidth taşıyan View) bulur. */
function inputBox(testID: string) {
  let node: ReturnType<typeof screen.getByTestId> | null = screen.getByTestId(testID);
  while (node && !StyleSheet.flatten(node.props.style)?.borderWidth) node = node.parent;
  return node?.props.style;
}

describe('fieldBoxStyle (tek kaynak)', () => {
  it('normal: beyaz zemin, ince çerçeve, radiusRole.input, md = 40', () => {
    expect(fieldBoxStyle()).toMatchObject({
      backgroundColor: colors.surface.elevated,
      borderColor: colors.border.DEFAULT,
      borderWidth: 1,
      borderRadius: radiusRole.input,
      minHeight: theme.controlHeight.md,
    });
  });

  it('odak / hata / pasif durumları', () => {
    expect(fieldBoxStyle({ focused: true }).borderColor).toBe(colors.primary[500]);
    expect(fieldBoxStyle({ error: 'x', focused: true }).borderColor).toBe(colors.danger[500]);
    expect(fieldBoxStyle({ disabled: true }).backgroundColor).toBe(colors.surface.DEFAULT);
    expect(fieldBoxStyle({ size: 'lg' }).minHeight).toBe(theme.controlHeight.lg);
  });
});

describe('Input / Select / DateField / FieldTrigger kutusu aynı yüzey', () => {
  it('normal durumda aynı zemin/çerçeve/radius/yükseklik/dolgu', () => {
    render(
      <>
        <Input testID="in" />
        <Select testID="sel" onChange={jest.fn()} options={[]} />
        <DateField testID="date" onChange={jest.fn()} />
        <FieldTrigger testID="ft" onPress={jest.fn()} placeholder="Seçin" />
      </>,
    );
    const expected = pick(inputBox('in'));
    expect(pick(screen.getByTestId('sel').props.style)).toEqual(expected);
    expect(pick(screen.getByTestId('date').props.style)).toEqual(expected);
    expect(pick(screen.getByTestId('ft').props.style)).toEqual(expected);
  });

  it('pasif ve hata durumları Input ile aynı', () => {
    render(
      <>
        <Input testID="in-d" editable={false} />
        <FieldTrigger testID="ft-d" onPress={jest.fn()} disabled />
        <Input testID="in-e" error="Hata" />
        <FieldTrigger testID="ft-e" onPress={jest.fn()} error="Hata" />
      </>,
    );
    expect(pick(screen.getByTestId('ft-d').props.style)).toEqual(pick(inputBox('in-d')));
    expect(pick(screen.getByTestId('ft-e').props.style)).toEqual(pick(inputBox('in-e')));
  });
});

describe('FieldTrigger', () => {
  it('etiket kutunun ÜSTÜNDE (Label, zorunlu yıldız danger); kutuda yalnız değer/placeholder', () => {
    render(<FieldTrigger label="İl" required onPress={jest.fn()} placeholder="Bir il seçin" testID="ft" />);
    expect(screen.getByText(/^İl/)).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText(/^\s*\*$/, { includeHiddenElements: true }).props.style).color).toBe(
      colors.danger[600],
    );
    // Kutunun (Pressable) içinde etiket metni yok.
    expect(screen.getByTestId('ft').findAll((n: { props: { children?: unknown } }) => n.props.children === 'İl')).toHaveLength(0);
    expect(screen.getByText('Bir il seçin')).toBeTruthy();
  });
});
