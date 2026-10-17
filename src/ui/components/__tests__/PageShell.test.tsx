import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PageHeader, PageShell, RawText, theme, toast, ToastHost } from '@/ui';
import { resetToastForTests, TOAST_GAP } from '../Toast';

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

  it('alt çubuk varken toast çubuğun üstünde (kök toast katmanına bildirilir); çubuk kalkınca geri döner', () => {
    resetToastForTests();
    const view = render(
      <>
        <ToastHost />
        <PageShell title="Sepet" footer={<RawText>Öde</RawText>}>
          <RawText>içerik</RawText>
        </PageShell>
      </>,
    );
    fireEvent(screen.getByTestId('page-shell-footer'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 76 } },
    });
    act(() => {
      toast('Sepete eklendi', { duration: 0 });
    });
    const bottom = () => StyleSheet.flatten(screen.getByTestId('toast').props.style).bottom;
    expect(bottom()).toBe(76 + TOAST_GAP);
    view.rerender(
      <>
        <ToastHost />
        <PageShell title="Sepet" loading footer={<RawText>Öde</RawText>}>
          <RawText>içerik</RawText>
        </PageShell>
      </>,
    );
    expect(bottom()).toBe(theme.spacing[2] + TOAST_GAP);
    resetToastForTests();
  });

  describe('gecikmeli yükleniyor (useDelayedLoading)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());
    const skeleton = () => screen.queryByTestId('page-shell-skeleton', { includeHiddenElements: true });

    it('loading → gecikme penceresinde boş gövde, sonra Skeleton; içerik ve alt bar yok', () => {
      render(
        <PageShell title="X" loading footer={<RawText>Kaydet</RawText>}>
          <RawText>içerik</RawText>
        </PageShell>,
      );
      // Gecikme penceresi: iskelet henüz yok, eski içerik de çizilmez.
      expect(skeleton()).toBeNull();
      expect(screen.getByTestId('page-shell-loading-pending')).toBeTruthy();
      expect(screen.queryByText('içerik')).toBeNull();
      expect(screen.queryByTestId('page-shell-footer')).toBeNull();
      act(() => {
        jest.advanceTimersByTime(theme.loading.delayMs);
      });
      expect(skeleton()).toBeTruthy();
      expect(screen.queryByText('içerik')).toBeNull();
      expect(screen.queryByTestId('page-shell-footer')).toBeNull();
    });

    it('gecikmeden kısa yükleme: iskelet hiç çizilmez, içerik hemen gelir', () => {
      const view = render(
        <PageShell title="X" loading>
          <RawText>içerik</RawText>
        </PageShell>,
      );
      act(() => {
        jest.advanceTimersByTime(theme.loading.delayMs - 50);
      });
      view.rerender(
        <PageShell title="X">
          <RawText>içerik</RawText>
        </PageShell>,
      );
      expect(skeleton()).toBeNull();
      expect(screen.getByText('içerik')).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(skeleton()).toBeNull();
    });

    it('iskelet çıktıysa en az minVisibleMs kalır, sonra içerik', () => {
      const view = render(
        <PageShell title="X" loading>
          <RawText>içerik</RawText>
        </PageShell>,
      );
      act(() => {
        jest.advanceTimersByTime(theme.loading.delayMs);
      });
      expect(skeleton()).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(50);
      });
      view.rerender(
        <PageShell title="X">
          <RawText>içerik</RawText>
        </PageShell>,
      );
      // Veri geldi ama iskelet asgari süreyi doldurmadı → hâlâ iskelet.
      expect(skeleton()).toBeTruthy();
      expect(screen.queryByText('içerik')).toBeNull();
      act(() => {
        jest.advanceTimersByTime(theme.loading.minVisibleMs - 50);
      });
      expect(skeleton()).toBeNull();
      expect(screen.getByText('içerik')).toBeTruthy();
    });
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
