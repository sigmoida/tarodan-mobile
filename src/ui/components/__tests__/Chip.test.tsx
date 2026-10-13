import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Chip, theme } from '@/ui';

const { colors } = theme;
const boxStyle = () => {
  const style = screen.getByTestId('chip').props.style;
  return StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style);
};

describe('Chip (web @tarodan/ui)', () => {
  it('seçili: primary tonu çerçeve + metin; rounded-full, h24', () => {
    render(<Chip testID="chip" label="Tümü" selected onPress={jest.fn()} />);
    expect(boxStyle()).toMatchObject({
      height: 24,
      borderRadius: theme.radius.full,
      borderColor: colors.primary[200],
      backgroundColor: colors.primary[50],
    });
    expect(StyleSheet.flatten(screen.getByText('Tümü').props.style).color).toBe(colors.primary[600]);
    expect(screen.getByRole('button')).toBeSelected();
  });

  it('seçili değil: border-border, muted metin, zeminsiz', () => {
    render(<Chip testID="chip" label="Yeni" active={false} onPress={jest.fn()} />);
    expect(boxStyle()).toMatchObject({ borderColor: colors.border.DEFAULT, backgroundColor: 'transparent' });
    expect(StyleSheet.flatten(screen.getByText('Yeni').props.style).color).toBe(colors.text.muted);
  });

  it('etiket modu (seçim yok) varyant tonunu korur', () => {
    render(<Chip testID="chip" label="Ödendi" variant="success" />);
    expect(boxStyle().backgroundColor).toBe(colors.success[50]);
  });

  it('basılır', () => {
    const onPress = jest.fn();
    render(<Chip label="1:18" selected={false} onPress={onPress} />);
    fireEvent.press(screen.getByText('1:18'));
    expect(onPress).toHaveBeenCalled();
  });
});
