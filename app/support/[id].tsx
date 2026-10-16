import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, PageHeader, SectionCard, StatusBadge, Text, Textarea, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { buildTicketStatusConfig } from './_lib/status';
import {
  buildCategoryLabels,
  formatTicketDate,
  formatTicketDateTime,
  type TicketMessage,
} from './_lib/types';
import { useSupportTicket } from './_hooks/useSupportTicket';

const { colors, spacing, radius } = theme;

/** Mesaj balonu — web: `rounded-2xl`, kendi mesajım primary-500 + `rounded-br-sm`, karşı taraf kenarlıklı. */
function MessageBubble({ message, mine, name }: { message: TicketMessage; mine: boolean; name: string }) {
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <View style={styles.bubbleMeta}>
          <Text variant="caption" weight="medium" tone={mine ? 'inverted' : 'heading'}>
            {name}
          </Text>
          <Text variant="caption" tone={mine ? 'inverted' : 'muted'} style={mine ? styles.timeMine : undefined}>
            {formatTicketDateTime(message.createdAt)}
          </Text>
        </View>
        <Text variant="bodySm" tone={mine ? 'inverted' : 'body'}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

/**
 * Destek talebi detayı — web `support/[id]` düzeni: PageHeader (konu + #numara/kategori/tarih +
 * durum rozeti) + mesajlar SectionCard'ı. Yanıt alanı telefonda sabit alt bar (sohbet kalıbı: etiketsiz kompakt girdi + Gönder, klavye açıkken
 * görünür alan korunur);
 * kapalı talepte bilgi notu. Sorgu/mutasyon `useSupportTicket`'ta.
 */
export default function SupportTicketDetailScreen() {
  const { t } = useTranslation();
  const f = useSupportTicket();
  const title = t('support.ticketTitle');
  const onBack = () => (router.canGoBack() ? router.back() : router.replace('/support'));
  const { ticket } = f;

  if (!ticket) {
    return (
      <PageShell
        title={title}
        onBack={onBack}
        loading={f.isLoading}
        error={f.loadFailed || undefined}
        onRetry={f.retry}
        empty={!f.isLoading}
        emptyState={{ icon: 'exclamation-circle', title: t('support.notFound'), subtitle: t('emptyState.notFoundHint') }}
      />
    );
  }

  const isClosed = ticket.status === 'closed';
  const messages = (ticket.messages ?? []).filter((m) => !m.isInternal);
  const categoryLabels = buildCategoryLabels(t);

  return (
    <PageShell
      title={title}
      onBack={onBack}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      footer={
        isClosed ? (
          <Text variant="bodySm" tone="muted" align="center">
            {t('support.closedNotice')}
          </Text>
        ) : (
          <>
            <Textarea
              accessibilityLabel={t('support.replyLabel')}
              value={f.reply}
              onChangeText={f.setReply}
              rows={2}
              placeholder={t('message.typeMessage')}
            />
            <Button
              variant="primary"
              size="lg"
              fullWidth
              title={t('common.send')}
              onPress={() => f.replyMutation.mutate(f.reply.trim())}
              isLoading={f.replyMutation.isPending}
              disabled={f.replyMutation.isPending || f.reply.trim().length < 1}
            />
          </>
        )
      }
    >
      <PageHeader
        title={ticket.subject}
        description={
          <View style={styles.meta}>
            <Text variant="caption" tone="muted">
              #{ticket.ticketNumber ?? String(ticket.id).slice(0, 8)}
            </Text>
            <Text variant="caption" tone="muted">
              {categoryLabels[ticket.category] ?? ticket.category}
              {ticket.createdAt ? ` · ${formatTicketDate(ticket.createdAt)}` : ''}
            </Text>
          </View>
        }
        actions={<StatusBadge status={ticket.status} config={buildTicketStatusConfig(t)} size="sm" />}
      />

      <SectionCard>
        <View style={styles.messages}>
          {messages.map((message) => {
            const mine = message.senderId === ticket.creatorId;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                mine={mine}
                name={mine ? t('support.you') : message.senderName || t('support.team')}
              />
            );
          })}
        </View>
      </SectionCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  meta: { gap: spacing[0.5], marginTop: spacing[0.5] },
  messages: { gap: spacing[4] },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    gap: spacing[1],
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  bubbleMine: { backgroundColor: colors.primary[500], borderBottomRightRadius: radius.sm },
  bubbleTheirs: {
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  timeMine: { opacity: 0.7 },
});
