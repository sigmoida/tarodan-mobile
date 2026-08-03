import { View } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '@/ui';

import { styles } from './_lib/styles';
import { useRefundRequests } from './_hooks/useRefundRequests';
import {
  RefundAuthGate,
  RefundList,
  RefundSellerNote,
  RefundTabs,
} from './_components/RefundSections';

/**
 * İade talepleri — THIN ekran: controller + bölümler.
 *
 * İki sekme: "Taleplerim" (`/refund-requests/me`) ve "Bana Açılanlar"
 * (`/refund-requests/seller`). İkincisi salt okunur; gerekçesi
 * `_components/RefundSections.tsx` → `RefundSellerNote`'ta.
 */
export default function RefundRequestsScreen() {
  const f = useRefundRequests();

  if (!f.isAuthenticated) return <RefundAuthGate f={f} />;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="İade Talepleri"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
      <RefundTabs f={f} />
      <RefundSellerNote f={f} />
      <RefundList f={f} />
    </View>
  );
}
