import { router } from 'expo-router';
import { PageShell } from '@/components/common/PageShell';
import { useMembershipManage } from './_hooks/useMembershipManage';
import { MembershipManageSkeleton } from '../_components/MembershipSkeletons';
import { CurrentPlanCard, ScheduledChangeCard, ManageActions } from './_components/ManageSections';

/** Üyelik yönetimi — PageShell + SectionCard dizisi; bildirimler toast. (Yalnız görünüm: satın alma kapıları değişmedi.) */
export default function MembershipManageScreen() {
  const f = useMembershipManage();

  const back = () => (router.canGoBack() ? router.back() : router.replace('/membership' as any));

  return (
    <PageShell
      title={f.t('membership.manageMembership')}
      onBack={back}
      loading={f.isLoading}
      loadingFallback={<MembershipManageSkeleton />}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      <CurrentPlanCard f={f} />
      <ScheduledChangeCard f={f} />
      <ManageActions f={f} />
    </PageShell>
  );
}
