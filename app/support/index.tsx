import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import {
  Button,
  Card,
  Spinner,
  Text,
  StatusBadge,
  theme,
  ScreenHeader,
} from '@/ui';
import type { BadgeVariant } from '@/ui';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { supportApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { colors } = theme;

// Backend TicketStatus enum'unun TÜM değerleri (web /support ile parite).
// Eksik durum = StatusBadge ham enum gösterir.
// [id].tsx ile TEK kaynak (support.* anahtarları) — kopya harita çeviri sürüklenmesine yol açar.
const buildTicketStatusConfig = (t: TFunction): Record<string, { label: string; variant: BadgeVariant }> => ({
  open: { label: t('support.open'), variant: 'info' },
  in_progress: { label: t('support.inProgress'), variant: 'warning' },
  waiting_customer: { label: t('support.waitingCustomer'), variant: 'primary' },
  resolved: { label: t('support.resolved'), variant: 'success' },
  closed: { label: t('support.closed'), variant: 'default' },
});

// Backend TicketCategory enum'u ile birebir.
const buildCategoryLabels = (t: TFunction): Record<string, string> => ({
  shipping: t('support.category.shipping'),
  payment: t('support.category.payment'),
  account: t('support.category.account'),
  product: t('support.category.product'),
  trade: t('support.category.trade'),
  technical: t('support.category.technical'),
  other: t('support.category.other'),
});

interface TicketSummary {
  id: string;
  ticketNumber?: string;
  subject: string;
  category: string;
  status: string;
  createdAt?: string;
  messageCount?: number;
}

function formatDate(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function SupportTicketsScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const ticketStatusConfig = buildTicketStatusConfig(t);
  const categoryLabels = buildCategoryLabels(t);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['support-tickets', 'me'],
    queryFn: async () => {
      // api interceptor yanıtı unwrap etmez → res.data backend gövdesi.
      // getUserTickets { tickets, total, page, pageSize } döndürür.
      const res: any = await supportApi.getMyTickets({ page: 1, pageSize: 50 });
      const payload = res?.data ?? res;
      const list = payload?.tickets ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
      return list as TicketSummary[];
    },
    enabled: isAuthenticated,
  });

  const tickets = data ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Yeni talep oluşturup geri dönünce listeyi tazele.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) refetch();
    }, [isAuthenticated, refetch]),
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('support.supportTickets')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <View style={styles.centeredContainer}>
          <Ionicons name="headset-outline" size={64} color={colors.primary[600]!} />
          <Text variant="h2" style={styles.title}>{t('support.supportTickets')}</Text>
          <Text variant="body" tone="muted" style={styles.subtitle}>
            {t('support.ticketsLoginPrompt')}
          </Text>
          <Button variant="primary" title={t('common.login')} onPress={() => router.push('/(auth)/login')} style={{ alignSelf: 'center' }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('support.supportTickets')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />

      <View style={styles.newButtonWrap}>
        <Button
          variant="primary"
          title={t('support.createTicket')}
          icon="add"
          onPress={() => router.push('/support/new')}
          fullWidth
        />
      </View>

      {isLoading && tickets.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color={colors.text.subtle} />
          <Text variant="h3" style={styles.emptyTitle}>{t('support.emptyTitle')}</Text>
          <Text variant="body" tone="muted" style={styles.emptySubtitle}>
            {t('support.emptySubtitle')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[600]!]} />
          }
        >
          {tickets.map((ticket) => (
            <Pressable key={ticket.id} onPress={() => router.push(`/support/${ticket.id}` as any)}>
              <Card variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text variant="caption" style={styles.muted}>
                    #{ticket.ticketNumber ?? ticket.id.slice(0, 8)}
                  </Text>
                  <StatusBadge status={ticket.status} config={ticketStatusConfig} size="sm" />
                </View>
                <View style={styles.cardBody}>
                  <Text variant="label" numberOfLines={2}>{ticket.subject}</Text>
                  <Text variant="caption" style={styles.muted}>
                    {categoryLabels[ticket.category] ?? ticket.category}
                    {ticket.createdAt ? ` · ${formatDate(ticket.createdAt)}` : ''}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.subtle} />
                </View>
              </Card>
            </Pressable>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.alt },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[8] },
  title: { marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
  subtitle: { textAlign: 'center', marginBottom: theme.spacing[6] },
  newButtonWrap: { paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[8] },
  emptyTitle: { marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
  emptySubtitle: { textAlign: 'center' },
  list: { flex: 1, paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3] },
  card: { marginBottom: theme.spacing[3] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
  muted: { color: colors.text.muted },
  cardBody: { gap: theme.spacing[1] },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: theme.spacing[1.5] },
});
