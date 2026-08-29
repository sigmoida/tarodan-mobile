import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenHeader, ScreenLoader, ErrorState, ThemedRefreshControl } from '@/components/common';
import { useOfferDetail } from './_hooks/useOfferDetail';
import { styles } from './_lib/styles';
import { OfferDetailCards } from './_components/OfferDetailCards';
import { OfferDetailActions } from './_components/OfferDetailActions';
import { CounterDialog } from './_modals/CounterDialog';

export default function OfferDetailScreen() {
  const { t } = useTranslation();
  const f = useOfferDetail();

  if (f.isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('offer.detailTitle')} />
        <ScreenLoader />
      </View>
    );
  }

  if (f.error || !f.offer) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('offer.detailTitle')} />
        <ErrorState fullscreen onRetry={() => f.refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('offer.detailTitle')} />

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={<ThemedRefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} />}
      >
        <OfferDetailCards f={f} />
        <OfferDetailActions f={f} />
      </ScrollView>

      <CounterDialog f={f} />
    </View>
  );
}
