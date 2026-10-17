import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ErrorState, SectionCard, StatusBadge, Text, theme, Icon, useDelayedLoading } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { buildTicketStatusConfig } from './_lib/status';
import { buildCategoryLabels, formatTicketDate, type TicketSummary } from './_lib/types';
import { useSupportTickets } from './_hooks/useSupportTickets';
import { SupportTicketsSkeleton } from './_components/SupportTicketsSkeleton';

const { colors, spacing } = theme;

/** Talep satırı: #numara + durum rozeti, konu, kategori · tarih, sağda ok. */
function TicketRow({
  ticket,
  categoryLabel,
  statusConfig,
}: {
  ticket: TicketSummary;
  categoryLabel: string;
  statusConfig: ReturnType<typeof buildTicketStatusConfig>;
}) {
  return (
    <Pressable
      onPress={() => router.push(`/support/${ticket.id}` as never)}
      accessibilityRole="button"
      style={styles.row}
    >
      <View style={styles.rowMain}>
        <View style={styles.rowMeta}>
          <Text variant="caption" tone="muted">
            #{ticket.ticketNumber ?? ticket.id.slice(0, 8)}
          </Text>
          <StatusBadge status={ticket.status} config={statusConfig} size="sm" />
        </View>
        <Text variant="label" numberOfLines={2}>
          {ticket.subject}
        </Text>
        <Text variant="caption" tone="muted">
          {categoryLabel}
          {ticket.createdAt ? ` · ${formatTicketDate(ticket.createdAt)}` : ''}
        </Text>
      </View>
      <Icon name="chevron-right" size={theme.iconSize.md} color={colors.text.subtle} />
    </Pressable>
  );
}

/**
 * Destek taleplerim — PageShell (beyaz üst bar, çekip yenileme, sabit alt bar = "Talep Oluştur") +
 * tek SectionCard içinde talep satırları. Yükleniyor = Skeleton, boş = kart içi EmptyState.
 * Sorgu `useSupportTickets`'ta; ekran yalnız kompozisyon.
 */
export default function SupportTicketsScreen() {
  const { t } = useTranslation();
  const f = useSupportTickets();
  const title = t('support.supportTickets');
  const initialLoading = f.isLoading && f.tickets.length === 0;
  // İlk yükleme iskeleti gecikmeli: <150 ms süren yüklemede hiç çizilmez (göz kırpma yok).
  const showSkeleton = useDelayedLoading(initialLoading);

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={title}
        empty
        emptyState={{
          icon: 'lifebuoy',
          title,
          subtitle: t('support.ticketsLoginPrompt'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  const statusConfig = buildTicketStatusConfig(t);
  const categoryLabels = buildCategoryLabels(t);

  return (
    <PageShell
      title={title}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t('support.createTicket')}
          onPress={() => router.push('/support/new')}
        />
      }
    >
      {/* Gecikme penceresinde (iskelet henüz yok) boş kart çizilmez. */}
      {initialLoading && !showSkeleton ? null : (
        <SectionCard>
          {initialLoading ? (
            <SupportTicketsSkeleton />
          ) : f.loadFailed ? (
            <ErrorState placement="inline" onRetry={f.retry} />
          ) : f.tickets.length === 0 ? (
            <EmptyState
              icon="chat-bubble-left-right"
              title={t('support.emptyTitle')}
              subtitle={t('support.emptySubtitle')}
            />
          ) : (
            f.tickets.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                categoryLabel={categoryLabels[ticket.category] ?? ticket.category}
                statusConfig={statusConfig}
              />
            ))
          )}
        </SectionCard>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  rowMain: { flex: 1, gap: spacing[1] },
  rowMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
