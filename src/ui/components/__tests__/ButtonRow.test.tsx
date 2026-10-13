import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, ButtonRow } from '@/ui';

const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 40 } } });

const measure = (i: number) => screen.getByTestId(`row-measure-${i}`, { includeHiddenElements: true });
const direction = () => StyleSheet.flatten(screen.getByTestId('row-items').props.style).flexDirection;

describe('ButtonRow', () => {
  const renderRow = () =>
    render(
      <ButtonRow testID="row" gap={8}>
        <Button title="Vazgeç" variant="outline" />
        <Button title="Teklifi Gönder" />
      </ButtonRow>,
    );

  it('ölçüm gelmeden yan yana (row) çizer; etiketler sarmaz (numberOfLines=1)', () => {
    renderRow();
    expect(screen.getByText('Vazgeç').props.numberOfLines).toBe(1);
    expect(screen.getByText('Teklifi Gönder').props.numberOfLines).toBe(1);
  });

  it('doğal genişlikler eşit paya sığıyorsa yan yana kalır', () => {
    renderRow();
    fireEvent(screen.getByTestId('row'), 'layout', layout(320));
    fireEvent(measure(0), 'layout', layout(90));
    fireEvent(measure(1), 'layout', layout(140));
    // slot = (320 - 8) / 2 = 156 >= 140 → row
    expect(direction()).toBe('row');
  });

  it('en geniş etiket eşit paya sığmazsa alt alta (column) dizer', () => {
    renderRow();
    fireEvent(screen.getByTestId('row'), 'layout', layout(240));
    fireEvent(measure(0), 'layout', layout(90));
    fireEvent(measure(1), 'layout', layout(160));
    // slot = (240 - 8) / 2 = 116 < 160 → stack
    expect(direction()).toBe('column');
  });

  it('layout="stack" her zaman alt alta', () => {
    render(
      <ButtonRow testID="row" layout="stack">
        <Button title="A" />
        <Button title="B" />
      </ButtonRow>,
    );
    expect(direction()).toBe('column');
  });

  it('ölçüm kopyası erişilebilirlik ağacında/sorgularda yok: tek "Vazgeç"', () => {
    renderRow();
    expect(screen.getAllByText('Vazgeç')).toHaveLength(1);
  });
});
