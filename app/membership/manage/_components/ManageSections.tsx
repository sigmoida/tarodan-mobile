import { View } from 'react-native';
import { Button, Card, Divider, Switch, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../_lib/styles';
import { formatDate, formatTL } from '../_lib/helpers';
import type { MembershipManageController } from '../_hooks/useMembershipManage';

const { colors } = theme;

/** Mevcut plan kartı — tier rozeti, durum, dönem/ödeme bilgileri, otomatik yenileme. */
export function CurrentPlanCard({ f }: { f: MembershipManageController }) {
  const { data, tierName, isPaid, isCancelled, autoRenew, t } = f;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.tierBadge}>
          <Ionicons name="sparkles-outline" size={16} color={colors.primary[600]!} />
          <Text style={styles.tierText}>{tierName}</Text>
        </View>
        {isPaid ? (
          isCancelled ? (
            <View style={styles.activeRow}>
              <Ionicons name="close-circle" size={18} color={colors.warning[600]!} />
              <Text style={[styles.activeText, { color: colors.warning[600]! }]}>{t('common.cancelled')}</Text>
            </View>
          ) : (
            <View style={styles.activeRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success[600]!} />
              <Text style={styles.activeText}>{t('common.active')}</Text>
            </View>
          )
        ) : null}
      </View>

      {isPaid && isCancelled ? (
        <View style={styles.cancelledNote}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warning[600]!} />
          <Text style={styles.cancelledNoteText}>
            {t('membership.manageCancelledNote', { endDate: formatDate(data?.currentPeriodEnd) })}
          </Text>
        </View>
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
        </>
      ) : (
        <Text style={styles.helperText}>
          {t('membership.manageFreeHelper')}
        </Text>
      )}
    </Card>
  );
}

/** Dönem sonuna planlanmış paket değişikliği — yoksa hiç çizilmez. */
export function ScheduledChangeCard({ f }: { f: MembershipManageController }) {
  const { t } = f;
  if (!f.hasScheduledChange) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.cancelledNote}>
        <Ionicons name="calendar-outline" size={16} color={colors.info[600]!} />
        <Text style={styles.cancelledNoteText}>
          {t('membership.manageScheduledChangeNote', {
            tierLabel: f.scheduledLabel,
            endDate: formatDate(f.data?.currentPeriodEnd),
          })}
        </Text>
      </View>
      <Button
        variant="outline"
        title={t('membership.manageCancelScheduledButton')}
        icon="close-circle-outline"
        onPress={f.handleCancelScheduledChange}
        isLoading={f.cancelScheduledChangeMutation.isPending}
        disabled={f.cancelScheduledChangeMutation.isPending}
        style={{ ...styles.actionBtn, borderColor: colors.danger[600]! }}
      />
    </Card>
  );
}

/** Plan değiştir / iptal / yükselt aksiyonları + yardım kutusu. */
export function ManageActions({ f }: { f: MembershipManageController }) {
  const { t } = f;
  return (
    <>
      {f.isPaid ? (
        <>
          <Button
            variant="primary"
            title={t('membership.changePlan')}
            icon="swap-vertical"
            onPress={() => router.push('/membership' as any)}
            style={styles.actionBtn}
          />
          {!f.isCancelled && (
            <Button
              variant="outline"
              title={t('membership.cancelMembership')}
              icon="close-circle-outline"
              onPress={f.handleCancel}
              isLoading={f.cancelMutation.isPending}
              disabled={f.cancelMutation.isPending}
              style={{ ...styles.actionBtn, borderColor: colors.danger[600]! }}
            />
          )}
        </>
      ) : (
        <Button
          variant="primary"
          title={t('membership.manageUpgradeButton')}
          icon="arrow-up"
          onPress={() => router.push('/membership' as any)}
          style={styles.actionBtn}
        />
      )}

      <View style={styles.helpBox}>
        <Ionicons name="information-circle-outline" size={18} color={colors.info[600]!} />
        <Text style={styles.helpText}>
          {t('membership.manageHelpText')}
        </Text>
      </View>
    </>
  );
}
