import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Alert, Text, theme } from '@/ui';
import { alertLook } from '../Alert';

const { colors } = theme;
const boxOf = () => StyleSheet.flatten(screen.getByTestId('a').props.style);

describe('Alert — tek mesaj kutusu', () => {
  it.each([
    ['info', colors.gray[50], colors.border.DEFAULT],
    ['success', colors.success[50], colors.success[200]],
    ['warning', colors.warning[50], colors.warning[200]],
    ['danger', colors.danger[50], colors.danger[200]],
  ] as const)('%s: temel palet zemini + çerçevesi, ortak dolgu/köşe', (variant, bg, border) => {
    render(<Alert testID="a" variant={variant} title="Başlık">Metin</Alert>);
    expect(boxOf()).toMatchObject({
      backgroundColor: bg,
      borderColor: border,
      borderWidth: 1,
      borderRadius: theme.radiusRole.card,
      padding: theme.spacing[4],
    });
    expect(screen.getByText('Başlık')).toBeTruthy();
    expect(screen.getByText('Metin')).toBeTruthy();
  });

  it('info mavi DEĞİL: bilgi paletine hiç dokunmaz (nötr gri)', () => {
    const infoValues = Object.values(colors.info);
    for (const value of Object.values(alertLook.info)) {
      expect(infoValues).not.toContain(value);
    }
  });

  it('varsayılan varyant info; her varyant kendi ikonunu çizer, `icon` adı değiştirir', () => {
    expect(alertLook.info.iconName).toBe('information-circle');
    expect(alertLook.success.iconName).toBe('check-circle');
    expect(alertLook.warning.iconName).toBe('exclamation-triangle');
    expect(alertLook.danger.iconName).toBe('exclamation-circle');
    render(<Alert testID="a">Not</Alert>);
    expect(boxOf().backgroundColor).toBe(colors.gray[50]);
  });

  it('action satırı gövdenin altında çizilir', () => {
    render(
      <Alert testID="a" variant="success" action={<Text>Kaldır</Text>}>
        Uygulandı
      </Alert>,
    );
    expect(screen.getByText('Kaldır')).toBeTruthy();
  });

  it('birden çok metin parçasını tek <Text> içinde çizer (çıplak metin yok)', () => {
    const a = 'Aktif öne çıkarma var.';
    const b = ' Süre uzatılır.';
    render(
      <Alert variant="info">
        {a}
        {b}
      </Alert>,
    );
    expect(screen.getByText('Aktif öne çıkarma var. Süre uzatılır.')).toBeTruthy();
  });
});
