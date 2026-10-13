import React from 'react';
import { router } from 'expo-router';
import { PageHeader } from '@/ui';
import { PageShell, type PageShellProps } from '@/components/common/PageShell';

export interface ContentPageProps
  extends Pick<
    PageShellProps,
    'footer' | 'overlay' | 'loading' | 'error' | 'onRetry' | 'refreshing' | 'onRefresh' | 'testID'
  > {
  /** Üst bar başlığı (web `DocPage` `title`; mobilde sayfa içinde tekrarlanmaz). */
  title: string;
  /** Başlık altı kısa açıklama (web `PageHeader` `description`). */
  description?: React.ReactNode;
  /** Başlık bandının sağ/alt aksiyonları. */
  actions?: React.ReactNode;
  /** Geri: varsayılan geçmiş yoksa ana sekmelere döner (derin bağlantıyla açılmış sayfa). */
  onBack?: () => void;
  children?: React.ReactNode;
}

/** Geçmiş varsa geri, yoksa ana sayfa — içerik sayfalarının ortak geri davranışı. */
export const goBackOrHome = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

/**
 * İçerik / destek / yasal sayfaların ortak çerçevesi — web `DocPage`'in karşılığı: `PageShell`
 * (beyaz üst bar + gövde) + içerikte `PageHeader` (açıklama ve aksiyonlar). Web'de sayfa başlığı
 * içerikte durur; telefonda başlık üst barda olduğu için içerikte TEKRARLANMAZ (aynı metin iki
 * kez çıkardı). Açıklama/aksiyon yoksa PageHeader hiç çizilmez. Gövde (SectionCard'lar, düz
 * metin, form) `children` olarak verilir. Düzen tek yerde: hepsi buradan geçer.
 */
export const ContentPage: React.FC<ContentPageProps> = ({
  title,
  description,
  actions,
  onBack,
  children,
  ...shell
}) => (
  <PageShell title={title} onBack={onBack ?? goBackOrHome} {...shell}>
    {description != null || actions != null ? (
      <PageHeader description={description} actions={actions} />
    ) : null}
    {children}
  </PageShell>
);

export default ContentPage;
