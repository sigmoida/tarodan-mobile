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
      <PageShell title="X" empty emptyState={{ icon: 'map-pin', title: 'Henüz adres yok', subtitle: 'Adres ekleyin' }}>
        <RawText>içerik</RawText>
      </PageShell>,
    );
    expect(screen.getByText('Henüz adres yok')).toBeTruthy();
  });
});

describe('PageShell overlay slotu', () => {
  const Draft = () => {
    const [v, setV] = React.useState('');
    return (
      <>
        <RawText testID="draft">{v || 'boş'}</RawText>
        <RawText onPress={() => setV('yazıldı')}>yaz</RawText>
      </>
    );
  };

  it('loading ve error durumunda children unmount olur ama overlay (modal) yerinde kalır', () => {
    const { rerender } = render(
      <PageShell title="X" overlay={<RawText>modal</RawText>}>
        <RawText>içerik</RawText>
      </PageShell>,
    );
    expect(screen.getByText('modal')).toBeTruthy();
    rerender(
      <PageShell title="X" loading overlay={<RawText>modal</RawText>}>
        <RawText>içerik</RawText>
      </PageShell>,
    );
    expect(screen.queryByText('içerik')).toBeNull();
    expect(screen.getByText('modal')).toBeTruthy();
    rerender(
      <PageShell title="X" error={new Error('x')} overlay={<RawText>modal</RawText>}>
        <RawText>içerik</RawText>
      </PageShell>,
    );
    expect(screen.getByText('modal')).toBeTruthy();
  });

  it('overlay içindeki durum loading geçişinde kaybolmaz (açık form modalı veri kaybetmez)', () => {
    const el = (loading: boolean) => (
      <PageShell title="X" loading={loading} overlay={<Draft />}>
        <RawText>içerik</RawText>
      </PageShell>
    );
    const { rerender } = render(el(false));
    fireEvent.press(screen.getByText('yaz'));
    expect(screen.getByTestId('draft')).toHaveTextContent('yazıldı');
    rerender(el(true));
    rerender(el(false));
    expect(screen.getByTestId('draft')).toHaveTextContent('yazıldı');
  });
});

describe('PageHeader', () => {
  it('vurgu çubuğu + 2xl kalın başlık + açıklama; onBack verilince chevron', () => {
    const onBack = jest.fn();
    const { rerender } = render(<PageHeader title="Mesajlar" description="Tüm konuşmalar" />);
    expect(screen.getByTestId('page-header-accent')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('Mesajlar').props.style)).toMatchObject({
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '700',
    });
    expect(screen.getByText('Tüm konuşmalar')).toBeTruthy();
    rerender(<PageHeader title="Detay" onBack={onBack} />);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(onBack).toHaveBeenCalled();
  });
});
