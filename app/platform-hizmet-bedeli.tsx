import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';
import { InfoPage, type InfoSection } from '@/components/common/InfoPage';
import { SUPPORT_EMAIL } from '@/constants/legalFacts';
import type { MessageKey } from '@/i18n/lib/generated/keys';

/**
 * Platform Hizmet Bedeli şeffaflık sayfası. Web karşılığı:
 * apps/web/src/app/platform-hizmet-bedeli/page.tsx.
 *
 * §1–2 web'den KASITLI olarak ayrışıyor: web hâlâ "%3" ve "500 TL → 15 TL"
 * yazıyor, canlı `pricing.buyerFeeRate` ise 10 (staging, 2026-08-03) — yani metin
 * gerçeğin dörtte birini söylüyordu. Oranı burada sabit yazmak aynı hatayı tekrar
 * eder; sayfa oranı sunucudan okuyamıyor (public ayar ucu `{}` dönüyor, oran
 * yalnız sepet quote'unda gelir), bu yüzden sayı vermek yerine kullanıcı ödeme
 * özetine yönlendiriliyor. Web tarafı da düzeltilmeli (bu reponun kapsamı dışı).
 */
export default function PlatformHizmetBedeliScreen() {
  const { t } = useTranslation();

  const bullets = (keys: MessageKey[]) => (
    <View style={{ gap: theme.spacing[1] }}>
      {keys.map((k) => (
        <Text key={k} variant="body" tone="body">
          {`• ${t(k)}`}
        </Text>
      ))}
    </View>
  );
  const para = (key: MessageKey) => (
    <Text variant="body" tone="body">
      {t(key)}
    </Text>
  );

  const sections: InfoSection[] = [
    { title: t('platformFeePage.s1Title'), content: t('platformFeePage.s1Content') },
    {
      title: t('platformFeePage.s2Title'),
      children: (
        <>
          {bullets(['platformFeePage.s2Item1', 'platformFeePage.s2Item2', 'platformFeePage.s2Item3'])}
          {para('platformFeePage.s2Outro')}
        </>
      ),
    },
    {
      title: t('platformFeePage.s3Title'),
      children: (
        <>
          {para('platformFeePage.s3Intro')}
          {bullets([
            'platformFeePage.s3Item1',
            'platformFeePage.s3Item2',
            'platformFeePage.s3Item3',
            'platformFeePage.s3Item4',
          ])}
        </>
      ),
    },
    {
      title: t('platformFeePage.s4Title'),
      children: (
        <>
          {para('platformFeePage.s4Intro')}
          {bullets([
            'platformFeePage.s4Item1',
            'platformFeePage.s4Item2',
            'platformFeePage.s4Item3',
            'platformFeePage.s4Item4',
          ])}
        </>
      ),
    },
    { title: t('platformFeePage.s5Title'), content: t('platformFeePage.s5Content') },
    {
      title: t('platformFeePage.s6Title'),
      content: t('platformFeePage.s6Content', { email: SUPPORT_EMAIL }),
    },
  ];

  return (
    <InfoPage
      title={t('mobile.pagePlatformFee')}
      pageTitle={t('mobile.pagePlatformFee')}
      description={t('legalContact.lastUpdatedJun2026')}
      sections={sections}
      footer={
        <Text variant="caption" tone="subtle">
          {t('platformFeePage.disclaimer')}
        </Text>
      }
    />
  );
}
