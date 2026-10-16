import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Button, IconButton, LoadingIndicator, ScreenLoader, Spinner, theme } from '@/ui';

const box = (testID = 'loading-indicator') => StyleSheet.flatten(screen.getByTestId(testID).props.style);

describe('LoadingIndicator (tek gösterge)', () => {
  it('kutu token ölçüsünde, renk tondan; progressbar + "Yükleniyor"', () => {
    render(<LoadingIndicator size="lg" tone="inverted" />);
    expect(box()).toMatchObject({ width: theme.loading.indicator.size.lg, height: theme.loading.indicator.size.lg });
    expect(screen.UNSAFE_getByType(ActivityIndicator).props.color).toBe(theme.loading.indicator.color.inverted);
    expect(screen.getByRole('progressbar', { name: 'Yükleniyor' })).toBeTruthy();
  });

  it('varsayılan md + primary; `color` tonu ezer; özel etiket', () => {
    const { rerender } = render(<LoadingIndicator />);
    expect(box().width).toBe(theme.loading.indicator.size.md);
    expect(screen.UNSAFE_getByType(ActivityIndicator).props.color).toBe(theme.loading.indicator.color.primary);
    rerender(<LoadingIndicator color={theme.colors.danger[600]} accessibilityLabel="Kaydediliyor" />);
    expect(screen.UNSAFE_getByType(ActivityIndicator).props.color).toBe(theme.colors.danger[600]);
    expect(screen.getByLabelText('Kaydediliyor')).toBeTruthy();
  });

  it('iOS: sm kutusu (16) native small (20) göstergeyi ölçekle sığdırır', () => {
    render(<LoadingIndicator size="sm" />);
    const ai = screen.UNSAFE_getByType(ActivityIndicator);
    expect(ai.props.size).toBe('small');
    expect(StyleSheet.flatten(ai.props.style).transform).toEqual([{ scale: 16 / 20 }]);
  });

  it('Spinner / ScreenLoader / Button / IconButton isLoading hepsi LoadingIndicator çizer', () => {
    render(
      <>
        <Spinner size="sm" testID="s" />
        <ScreenLoader />
        <Button title="Kaydet" isLoading />
        <IconButton icon="heart" accessibilityLabel="Favori" isLoading />
      </>,
    );
    expect(box('s').width).toBe(theme.loading.indicator.size.sm);
    expect(screen.getByTestId('screen-loader')).toBeTruthy();
    // Düğme: ikon yuvası boyunda (md → 16), etiket renginde.
    expect(box('button-loading').width).toBe(theme.iconSize.sm);
    expect(box('icon-button-loading').width).toBe(theme.iconSize.md);
    expect(screen.UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(4);
  });
});
