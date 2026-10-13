import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { PaymentResultCard, PaymentResultRow } from '../PaymentResultCard';

describe('PaymentResultCard', () => {
  it('başlık, açıklama, gövde ve eylemleri çizer', () => {
    render(
      <PaymentResultCard
        tone="success"
        title="Ödemeniz Başarılı!"
        description="Siparişiniz alındı."
        actions={<Text>Eylem</Text>}
        testID="result"
      >
        <PaymentResultRow label="Tutar">100,00 TL</PaymentResultRow>
      </PaymentResultCard>,
    );
    expect(screen.getByTestId('result')).toBeOnTheScreen();
    expect(screen.getByText('Ödemeniz Başarılı!')).toBeOnTheScreen();
    expect(screen.getByText('Siparişiniz alındı.')).toBeOnTheScreen();
    expect(screen.getByText('Tutar')).toBeOnTheScreen();
    expect(screen.getByText('100,00 TL')).toBeOnTheScreen();
    expect(screen.getByText('Eylem')).toBeOnTheScreen();
  });

  it('açıklama verilmezse çizilmez; üç ton da çöker değil', () => {
    const { rerender } = render(<PaymentResultCard tone="warning" title="Doğrulanıyor" />);
    expect(screen.getByText('Doğrulanıyor')).toBeOnTheScreen();
    rerender(<PaymentResultCard tone="danger" title="Başarısız" />);
    expect(screen.getByText('Başarısız')).toBeOnTheScreen();
  });

  it('satır değeri düğümse (rozet) olduğu gibi çizilir', () => {
    render(
      <PaymentResultRow label="Durum">
        <Text>Ödendi</Text>
      </PaymentResultRow>,
    );
    expect(screen.getByText('Ödendi')).toBeOnTheScreen();
  });
});
