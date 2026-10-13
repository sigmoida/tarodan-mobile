import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { EmptyStateProps } from '@/ui';
import { PageShell } from '@/components/common/PageShell';

export interface AuthGatePageProps {
  /** Üst bar başlığı (ve boş durum başlığı). */
  title: string;
  /** Boş durum başlığı; verilmezse üst bar başlığı. */
  emptyTitle?: string;
  /** Boş durum açıklaması (ekrana özel "giriş yap" gerekçesi). */
  subtitle?: string;
  icon?: EmptyStateProps['icon'];
  /** Geri oku; verilmezse PageShell'in router varsayılanı. */
  onBack?: () => void;
}

/**
 * Oturum gerektiren yığın ekranlarının misafir hali — PageShell + EmptyState + "Giriş Yap".
 * Her ekran kendi gate'ini elle çizmesin diye tek kaynak.
 */
export const AuthGatePage: React.FC<AuthGatePageProps> = ({ title, emptyTitle, subtitle, icon, onBack }) => {
  const { t } = useTranslation();
  return (
    <PageShell
      title={title}
      onBack={onBack}
      empty
      emptyState={{
        icon: icon ?? 'person-outline',
        title: emptyTitle ?? title,
        subtitle,
        actionLabel: t('common.login'),
        onAction: () => router.push('/(auth)/login'),
      }}
    />
  );
};

export default AuthGatePage;
