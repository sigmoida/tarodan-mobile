import { View, ScrollView } from 'react-native';
import { Spinner, Snackbar } from '@/ui';
import { router } from 'expo-router';
import { ScreenHeader, ThemedRefreshControl } from '@/components/common';
import { useMembershipManage } from './_hooks/useMembershipManage';
import { styles } from './_lib/styles';
import { CurrentPlanCard, ScheduledChangeCard, ManageActions } from './_components/ManageSections';

export default function MembershipManageScreen() {
  const f = useMembershipManage();

  const back = () => (router.canGoBack() ? router.back() : router.replace('/membership' as any));

  if (f.isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={f.t('membership.manageMembership')} onBack={back} />
        <View style={styles.loadingBox}>
          <Spinner size="lg" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={f.t('membership.manageMembership')} onBack={back} />
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={<ThemedRefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} />}
      >
        <CurrentPlanCard f={f} />
        <ScheduledChangeCard f={f} />
        <ManageActions f={f} />
      </ScrollView>

      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={() => f.setSnackbar({ ...f.snackbar, visible: false })}
        duration={3000}
      >
        {f.snackbar.message}
      </Snackbar>
    </View>
  );
}
