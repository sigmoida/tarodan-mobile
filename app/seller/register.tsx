import React from 'react';
import { Alert, Button, SectionCard, Text } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useAuthStore } from '@/stores/authStore';
import UpgradeCta from '@/components/UpgradeCta';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

/**
 * İşletme Hesabı — bilgilendirme ekranı.
 *
 * Web/backend mantığı: işletme hesabı AYRI bir hesaptır (POST /auth/register/business
 * → yeni user create eder). Mevcut bireysel hesap "işletmeye yükseltilmez".
 * Bu ekran kullanıcıyı bilgilendirir ve ayrı kurumsal kayıt akışına yönlendirir.
 */
export default function SellerRegisterScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const title = t('seller.businessAccountTitle');

  const handleBack = () =>
    router.canGoBack() ? router.back() : router.replace('/(tabs)');

  if (!isAuthenticated) {
    return (
      <PageShell
        title={title}
        onBack={handleBack}
        empty
        emptyState={{
          icon: 'briefcase',
          title: t('seller.useBusinessRegisterForm'),
          subtitle: t('emptyState.businessRegisterHint'),
          actionLabel: t('seller.openBusinessAccount'),
          onAction: () => router.push('/(auth)/register-business'),
        }}
      />
    );
  }

  const isBusinessAccount = !!(user?.companyName && user?.taxId);
  const isBusinessTier = user?.membershipTier === 'business';

  // Zaten kurumsal hesap: yönlendirme yerine üyelik/yönetim aksiyonu göster.
  if (isBusinessAccount) {
    return (
      <PageShell title={title} onBack={handleBack}>
        <Alert variant="success">
          {`${t('seller.alreadyBusinessAccount')}${
            isBusinessTier
              ? t('seller.businessMembershipActiveNote')
              : CAN_BUY_DIGITAL
                ? t('seller.completeBusinessMembershipNote')
                : t('seller.businessAccountDetailsRecordedNote')
          }`}
        </Alert>

        <Button
          testID="seller-register-continue-application"
          variant="primary"
          fullWidth
          title={t('seller.completeOrEditApplication')}
          onPress={() => router.push('/settings/business-application' as never)}
        />

        {/* Business üyeliğe geçiş yeni bir satın alma — iOS'ta gizli. */}
        {!isBusinessTier ? (
          <UpgradeCta>
            <Button
              variant="outline"
              fullWidth
              title={t('seller.switchToBusinessMembership')}
              onPress={() => router.replace('/membership')}
            />
          </UpgradeCta>
        ) : null}

        <Button variant="ghost" fullWidth title={t('common.goBack')} onPress={handleBack} />
      </PageShell>
    );
  }

  // Bireysel hesap: işletme olmak için ayrı hesap açması gerektiğini anlat.
  return (
    <PageShell title={title} onBack={handleBack}>
      {/* Ücretli Business kademesinin avantajları — iOS'ta satın alınamayan bir
          kademeyi pazarlamak olur (Apple 3.1.1/3.1.3), orada gizli. */}
      <UpgradeCta>
        <SectionCard title={t('seller.businessSellerBenefits')}>
          <Text variant="bodySm">• {t('seller.benefitUnlimitedListings')}</Text>
          <Text variant="bodySm">• {t('seller.benefitSearchPriority')}</Text>
          <Text variant="bodySm">• {t('seller.benefitInvoicingBulkUpload')}</Text>
          <Text variant="bodySm">• {t('seller.benefitBadgeAndStats')}</Text>
        </SectionCard>
      </UpgradeCta>

      <Alert variant="info">{t('seller.businessAccountSeparateNote')}</Alert>

      <Button
        variant="primary"
        fullWidth
        title={t('seller.openBusinessAccount')}
        onPress={() => router.push('/(auth)/register-business')}
      />

      <Button variant="ghost" fullWidth title={t('seller.cancel')} onPress={handleBack} />
    </PageShell>
  );
}
