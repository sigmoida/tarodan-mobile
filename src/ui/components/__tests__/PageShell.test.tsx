import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PageHeader, PageShell, RawText, theme } from '@/ui';

describe('PageShell', () => {
  it('beyaz üst bar + surface zemin + içerik + sabit alt bar', () => {
    render(
      <PageShell testID="ps" title="Adreslerim" footer={<RawText>Kaydet</RawText>}>
        <RawText>içerik</RawText>
      </PageShell>,
    );
    expect(screen.getByText('Adreslerim')).toBeTruthy();
    expect(screen.getByText('içerik')).toBeTruthy();
    expect(screen.getByTestId('page-shell-footer')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('ps').props.style).backgroundColor).toBe(
      theme.colors.surface.DEFAULT,
    );
  });

  it('loading → Skeleton, içerik ve alt bar yok', () => {
    render(
      <PageShell title="X" loading footer={<RawText>Kaydet</RawText>}>
        <RawText>içerik</RawText>
      </PageShell>,
    );
    expect(screen.getByTestId('page-shell-skeleton', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('içerik')).toBeNull();
    expect(screen.queryByTestId('page-shell-footer')).toBeNull();
  });

  it('error → ErrorState + onRetry; empty → EmptyState', () => {
    const onRetry = jest.fn();
    const { rerender } = render(
      <PageShell title="X" error={new Error('x')} onRetry={onRetry}>
        <RawText>içerik</RawText>
      </PageShell>,
    );
    fireEvent.press(screen.getByText('Tekrar Dene'));
    expect(onRetry).toHaveBeenCalled();
    rerender(
      <PageShell title="X" empty emptyState={{ title: 'Henüz adres yok' }}>
        <RawText>içerik</RawText>
      </PageShell>,
    );
    expect(screen.getByText('Henüz adres yok')).toBeTruthy();
  });
});

describe('PageHeader', () => {
  it('vurgu çubuğu + 2xl kalın başlık + açıklama; onBack verilince chevron', () => {
    const onBack = jest.fn();
    const { rerender } = render(<PageHeader title="Mesajlar" description="Tüm konuşmalar" />);
    expect(screen.getByTestId('page-header-accent')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('Mesajlar').props.style)).toMatchObject({
      fontSize: 24,
      fontWeight: '700',
    });
    expect(screen.getByText('Tüm konuşmalar')).toBeTruthy();
    rerender(<PageHeader title="Detay" onBack={onBack} />);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(onBack).toHaveBeenCalled();
  });
});
