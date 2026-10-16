import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { ListFooterRetry } from '../ListFooterRetry';

describe('ListFooterRetry', () => {
  it('genel hata metni ve "Tekrar dene" düğmesi; basınca onRetry', () => {
    const onRetry = jest.fn();
    render(<ListFooterRetry onRetry={onRetry} />);
    expect(screen.getByTestId('list-footer-retry')).toBeTruthy();
    expect(screen.getByText(i18n.t('common.genericError'))).toBeTruthy();
    fireEvent.press(screen.getByText(i18n.t('common.tryAgain')));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('özel mesaj verilirse onu gösterir', () => {
    render(<ListFooterRetry onRetry={jest.fn()} message="Sayfa yüklenemedi" testID="x" />);
    expect(screen.getByText('Sayfa yüklenemedi')).toBeTruthy();
    expect(screen.getByTestId('x')).toBeTruthy();
  });
});
