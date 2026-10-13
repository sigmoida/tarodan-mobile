import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Card, RawText, SectionCard, SectionCardAction, theme } from '@/ui';

const { colors, radius } = theme;

describe('SectionCard (web @tarodan/ui)', () => {
  it('çerçeve + rounded-lg + p-3, başlıkta 4×24 primary-500 vurgu ve kalın başlık', () => {
    render(
      <SectionCard testID="sc" title="Popüler">
        <RawText>içerik</RawText>
      </SectionCard>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('sc').props.style)).toMatchObject({
      borderWidth: 1,
      borderColor: colors.border.DEFAULT,
      borderRadius: radius.lg,
      padding: 12,
    });
    expect(StyleSheet.flatten(screen.getByTestId('section-card-accent').props.style)).toMatchObject({
      width: 4,
      height: 24,
      backgroundColor: colors.primary[500],
    });
    expect(StyleSheet.flatten(screen.getByText('Popüler').props.style)).toMatchObject({
      fontSize: 24,
      fontWeight: '700',
    });
    expect(screen.getByText('içerik')).toBeTruthy();
  });

  it('başlıksız: vurgu çubuğu yok', () => {
    render(
      <SectionCard>
        <RawText>gövde</RawText>
      </SectionCard>,
    );
    expect(screen.queryByTestId('section-card-accent')).toBeNull();
  });

  it('"Tümünü gör ›" aksiyonu varsayılan etiketle basılır', () => {
    const onPress = jest.fn();
    render(<SectionCard title="Yeni" action={<SectionCardAction onPress={onPress} />} />);
    fireEvent.press(screen.getByText('Tümünü gör'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Card (web @tarodan/ui)', () => {
  it('rounded-lg, surface-elevated; bordered çerçeveli', () => {
    render(<Card testID="c" variant="bordered" />);
    expect(StyleSheet.flatten(screen.getByTestId('c').props.style)).toMatchObject({
      borderRadius: radius.lg,
      backgroundColor: colors.surface.elevated,
      borderWidth: 1,
    });
  });

  it('default hafif gölge (soft)', () => {
    render(<Card testID="c" />);
    expect(StyleSheet.flatten(screen.getByTestId('c').props.style)).toMatchObject(theme.shadow.soft);
  });
});
