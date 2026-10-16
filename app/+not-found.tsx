import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { navigateTo } from '@/lib/navigation/goTo';

/**
 * Eşleşmeyen rota (bilinmeyen derin bağlantı, kaldırılmış eski bir ekran):
 * expo-router'ın kabuksuz "Unmatched Route" ekranı yerine PageShell + boş
 * durum + ana sayfaya dönüş. Geri oku `goBackOrHome` (geçmiş yoksa ana sekmeler).
 */
export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <PageShell
      testID="not-found-screen"
      mode="static"
      empty
      emptyState={{
        icon: 'exclamation-circle',
        title: t('error.pageNotFound'),
        subtitle: t('error.pageNotFoundDesc'),
        actionLabel: t('error.goHome'),
        onAction: () => navigateTo('/'),
        testID: 'not-found-empty',
      }}
    />
  );
}
