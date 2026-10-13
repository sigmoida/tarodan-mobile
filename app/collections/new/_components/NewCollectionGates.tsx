import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import UpgradeCta from '@/components/UpgradeCta';
import { getUpgradeMessage } from '@/utils/membershipLimits';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

/** Premium olmayan kullanıcıya gösterilen kapı. */
export function PremiumGate() {
  const { t } = useTranslation();
  const upgradeInfo = getUpgradeMessage(t, 'collectionFeature');
  return (
    <PageShell
      title={t('mobile.guestGarageTitle')}
      onBack={goBack}
      empty
      emptyState={{
        icon: 'rectangle-stack',
        title: upgradeInfo.title,
        subtitle: upgradeInfo.message,
        action: (
          <>
            {/* Yükseltme düğmesi iOS'ta kapalı: uygulama içinde ücretli kademeden söz etmek/satmak
                Apple IAP'siz yapılamıyor (Guideline 3.1.1 / 3.1.3). Başlık + nötr mesaj + "Geri"
                kalır ki ekran kendini açıklasın ve kullanıcı çıkabilsin. */}
            <UpgradeCta>
              <Button title={t('membership.upgradeToPremium')} onPress={() => router.push('/upgrade')} fullWidth />
            </UpgradeCta>
            <Button variant="ghost" title={t('common.goBack')} onPress={goBack} />
          </>
        ),
      }}
    />
  );
}

/** Giriş yapmamış kullanıcı kapısı. */
export function AuthGate() {
  const { t } = useTranslation();
  return (
    <PageShell
      title={t('collection.newCollectionTitle')}
      onBack={goBack}
      empty
      emptyState={{
        icon: 'rectangle-stack',
        title: t('collection.authGateTitle'),
        subtitle: t('collection.authGateSubtitle'),
        actionLabel: t('common.login'),
        onAction: () => router.push('/(auth)/login'),
      }}
    />
  );
}
