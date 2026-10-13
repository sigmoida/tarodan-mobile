import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { BrandFontProvider, Input, Label, Select, theme } from '@/ui';

const { colors } = theme;

/** TextInput'tan yukarı çıkıp çerçeveyi (borderWidth taşıyan View) bulur. */
const fieldOf = () => {
  let node: ReturnType<typeof screen.getByTestId> | null = screen.getByTestId('in');
  while (node && !StyleSheet.flatten(node.props.style)?.borderWidth) node = node.parent;
  return node?.props.style;
};

describe('Input (web @tarodan/ui)', () => {
  it('md: h40, metin base, rounded-lg, border-border', () => {
    render(<Input placeholder="Ad" testID="in" />);
    const field = { props: { style: fieldOf() } };
    expect(StyleSheet.flatten(screen.getByTestId('in').props.style).fontSize).toBe(theme.typography.fontSize.base);
    expect(StyleSheet.flatten(field?.props.style)).toMatchObject({
      height: 40,
      borderRadius: theme.radius.lg,
      borderColor: colors.border.DEFAULT,
    });
  });

  it('odakta primary-500, hatada danger-500 çerçeve ve sm hata metni', () => {
    const { rerender } = render(<Input testID="in" />);
    fireEvent(screen.getByTestId('in'), 'focus');
    expect(StyleSheet.flatten(fieldOf()).borderColor).toBe(
      colors.primary[500],
    );
    rerender(<Input testID="in" error="Zorunlu alan" />);
    expect(StyleSheet.flatten(screen.getByText('Zorunlu alan').props.style)).toMatchObject({
      fontSize: theme.typography.fontSize.sm,
      color: colors.danger[600],
    });
  });

  it('label + required kırmızı yıldız', () => {
    render(<Input label="E-posta" required />);
    expect(screen.getByText(/E-posta/)).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText(/^\s*\*$/, { includeHiddenElements: true }).props.style).color).toBe(colors.danger[600]);
  });

  it('marka fontu hazırken TextInput Noto Sans alır', () => {
    render(
      <BrandFontProvider ready>
        <Input testID="in" />
      </BrandFontProvider>,
    );
    expect(StyleSheet.flatten(screen.UNSAFE_getByType(TextInput).props.style).fontFamily).toBe(
      'NotoSans_400Regular',
    );
  });
});

describe('Label', () => {
  it('sm/500 ağırlık, body rengi', () => {
    render(<Label>Telefon</Label>);
    expect(StyleSheet.flatten(screen.getByText('Telefon').props.style)).toMatchObject({
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: colors.text.body,
    });
  });
});

describe('Select', () => {
  it('seçim yapılır ve tetikleyici Input ölçüsünde', () => {
    const onChange = jest.fn();
    render(
      <Select
        value=""
        onChange={onChange}
        placeholder="Seçin"
        options={[
          { value: 'a', label: 'Bir' },
          { value: 'b', label: 'İki' },
        ]}
      />,
    );
    fireEvent.press(screen.getByRole('combobox'));
    fireEvent.press(screen.getByText('İki'));
    expect(onChange).toHaveBeenCalledWith('b');
    expect(StyleSheet.flatten(screen.getByRole('combobox').props.style).height).toBe(40);
  });
});
