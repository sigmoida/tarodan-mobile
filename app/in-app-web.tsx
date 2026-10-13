import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { OwnSiteWebView } from '@/components/web/OwnSiteWebView';

/**
 * Mobil karşılığı olmayan site sayfalarını (reklam linkleri) uygulama içinde
 * açar. Yalnız KENDİ sitemizin https adresleri yüklenir — rota dışarıdan
 * (derin bağlantı) da çağrılabildiği için host `OwnSiteWebView`'da yeniden
 * doğrulanır. Satın alma sayfaları (üyelik/boost) HİÇBİR yoldan açılmaz — bkz.
 * `webViewGuard` (Apple 3.1.1: site menüsünden /membership'e geçip uygulama
 * içinde satın alma).
 */
export default function InAppWebScreen() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  return <OwnSiteWebView url={url} title="Tarodan" onBack={() => router.back()} />;
}
