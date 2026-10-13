import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OwnSiteWebView } from '@/components/web/OwnSiteWebView';
import { cookiePolicyUrl } from '@/lib/legal/cookiePolicy';

/**
 * Çerez politikası — web sayfası uygulama içinde (tek kaynak web; eskiden
 * burada "Ocak 2026" tarihli eski bir kopya vardı). Rota `/cookies` olarak
 * kalır: profil menüsü, onay kapısındaki belge bağlantısı ve "yasal metin
 * yolunda kapı gizlenir" kuralı (`isLegalTextPath`) bu yolu kullanıyor.
 */
export default function CookiePolicyScreen() {
  const { t, i18n } = useTranslation();
  return (
    <OwnSiteWebView
      testID="cookie-policy-web"
      url={cookiePolicyUrl(i18n.language)}
      title={t('mobile.pageCookies')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
    />
  );
}
