import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CountBadge, ScreenHeader, TopBarAction, theme } from '@/ui';

const { colors } = theme;

describe('ScreenHeader — sade beyaz üst bar (web)', () => {
  it('surface-elevated zemin + alt kenarlık; geri oku başlık renginde; başlık lg/600', () => {
    const onBack = jest.fn();
    render(<ScreenHeader title="Adreslerim" onBack={onBack} variant="primary" />);
    let node = screen.getByText('Adreslerim').parent;
    while (node && !StyleSheet.flatten(node.props.style)?.borderBottomWidth) node = node.parent;
    expect(StyleSheet.flatten(node?.props.style)).toMatchObject({
      backgroundColor: colors.surface.elevated,
      borderBottomColor: colors.border.DEFAULT,
    });
    expect(screen.getByTestId('icon-chevron-left').props.stroke).toBe(colors.text.heading);
    expect(StyleSheet.flatten(screen.getByText('Adreslerim').props.style)).toMatchObject({
      fontSize: 18,
      fontWeight: '600',
    });
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(onBack).toHaveBeenCalled();
  });

  it('TopBarAction: ikon başlık renginde, metin primary-600; sayaç rozeti', () => {
    const onPress = jest.fn();
    render(
      <ScreenHeader
        title="X"
        right={
          <>
            <TopBarAction icon="cart-outline" accessibilityLabel="Sepet" count={3} onPress={onPress} />
            <TopBarAction label="Kaydet" onPress={onPress} />
          </>
        }
      />,
    );
    expect(screen.getByTestId('icon-shopping-cart').props.stroke).toBe(colors.text.heading);
    expect(screen.getByText('3')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('Kaydet').props.style).color).toBe(colors.primary[600]);
    fireEvent.press(screen.getByText('Kaydet'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('CountBadge', () => {
  it('danger-500, 99+ sınırı, 0 iken yok', () => {
    const { rerender } = render(<CountBadge count={0} testID="cb" />);
    expect(screen.queryByTestId('cb')).toBeNull();
    rerender(<CountBadge count={150} testID="cb" />);
    expect(screen.getByText('99+')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('cb').props.style).backgroundColor).toBe(colors.danger[500]);
  });
});
