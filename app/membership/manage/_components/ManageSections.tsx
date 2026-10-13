import { View } from 'react-native';
import { Alert, Badge, Button, Divider, SectionCard, Switch, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { styles } from '../_lib/styles';
import { formatDate, formatTL } from '../_lib/helpers';
import UpgradeCta from '@/components/UpgradeCta';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import type { MembershipManageController } from '../_hooks/useMembershipManage';

/** Mevcut plan kartı — tier rozeti, durum, dönem/ödeme bilgileri, otomatik yenileme. */
export function CurrentPlanCard({ f }: { f: MembershipManageController }) {
  const { data, tierName, isPaid, isCancelled, autoRenew, t } = f;

  return (
    <SectionCard
      bodyStyle={styles.body}
    >
      <View style={styles.headerRow}>
        <Badge variant="default">{tierName}</Badge>
        {isPaid ? (
          <Badge variant={isCancelled ? 'warning' : 'success'} size="sm">
            {isCancelled ? t('common.cancelled') : t('common.active')}
          </Badge>
        ) : null}
      </View>

      {isPaid && isCancelled ? (
        <Alert variant="warning">
          {t('membership.manageCancelledNote', { endDate: formatDate(data?.currentPeriodEnd) })}
        </Alert>
      ) : null}

      {isPaid ? (
        <>
          <Divider style={{ marginVertical: theme.spacing[3] }} />
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>{t('discount.startLabel')}</Text>
            <Text style={styles.kvValue}>{formatDate(data?.currentPeriodStart)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>{t('discount.endLabel')}</Text>
            <Text style={styles.kvValue}>{formatDate(data?.currentPeriodEnd)}</Text>
          </View>
          {data?.nextBillingDate ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>{t('membership.manageNextPaymentLabel')}</Text>
              <Text style={styles.kvValue}>
                {formatDate(data.nextBillingDate)}
                {data.nextBillingAmount != null ? ` · ${formatTL(data.nextBillingAmount)}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Otomatik yenilemeyi yeniden AÇMAK PayTR'de yinelenen tahsilatı
              yeniden başlatmak demek — yani uygulama içi satın alma. Yarım
              gated bir switch (görünür ama devre dışı) yanıltıcı olurdu, bu
              yüzden kart bütünüyle kapanır. İPTAL düğmesi (ManageActions,
              aşağıda) satın alma olmadığı için iOS'ta da kalır. */}
          <UpgradeCta>
            <Divider style={{ marginVertical: theme.spacing[3] }} />

            {/* Auto-renew toggle */}
            <View style={styles.autoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.autoTitle}>{t('membership.autoRenew')}</Text>
                <Text style={styles.autoSub}>
                  {autoRenew
                    ? t('membership.manageAutoRenewOnHelper')
                    : t('membership.manageAutoRenewOffHelper')}
                </Text>
              </View>
              <Switch
                value={autoRenew}
                onValueChange={f.handleToggleAutoRenew}
                disabled={f.autoRenewMutation.isPending}
              />
            </View>
          </UpgradeCta>
        </>
      ) : (
        <Text variant="bodySm" tone="muted">
          {CAN_BUY_DIGITAL
            ? t('membership.manageFreeHelper')
            : t('membership.manageFreeHelperNeutral')}
        </Text>
      )}
    </SectionCard>
  );
}

/** Dönem sonuna planlanmış paket değişikliği — yoksa hiç çizilmez. */
export function ScheduledChangeCard({ f }: { f: MembershipManageController }) {
  const { t } = f;
  if (!f.hasScheduledChange) return null;

  return (
    <SectionCard bodyStyle={styles.body}>
      <Alert variant="info">
        {t('membership.manageScheduledChangeNote', {
          tierLabel: f.scheduledLabel,
          endDate: formatDate(f.data?.currentPeriodEnd),
        })}
      </Alert>
      <Button
        variant="danger"
        title={t('membership.manageCancelScheduledButton')}
        onPress={f.handleCancelScheduledChange}
        isLoading={f.cancelScheduledChangeMutation.isPending}
        disabled={f.cancelScheduledChangeMutation.isPending}
      />
    </SectionCard>
  );
}

/** Plan değiştir / iptal / yükselt aksiyonları + yardım kutusu. */
export function ManageActions({ f }: { f: MembershipManageController }) {
  const { t } = f;
  return (
    <>
      {f.isPaid ? (
        <>
          {/* Plan değiştirmek yeni bir satın alma — iOS'ta gizli. */}
          <UpgradeCta>
            <Button
              variant="primary"
              title={t('membership.changePlan')}
              onPress={() => router.push('/membership' as any)}
            />
          </UpgradeCta>
          {/* İptal satın alma değil — iOS'ta da kalmalı. */}
          {!f.isCancelled && (
            <Button
              variant="danger"
              title={t('membership.cancelMembership')}
              onPress={f.handleCancel}
              isLoading={f.cancelMutation.isPending}
              disabled={f.cancelMutation.isPending}
            />
          )}
        </>
      ) : (
        // Yükseltme düğmesi — satın alma, iOS'ta gizli.
        <UpgradeCta>
          <Button
            variant="primary"
            title={t('membership.manageUpgradeButton')}
            onPress={() => router.push('/membership' as any)}
          />
        </UpgradeCta>
      )}

      <Alert variant="info">{t('membership.manageHelpText')}</Alert>
    </>
  );
}
