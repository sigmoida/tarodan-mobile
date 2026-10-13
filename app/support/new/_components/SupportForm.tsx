import { View } from 'react-native';
import { Chip, Input, SectionCard, Text, Textarea } from '@/ui';
import { useTranslation } from 'react-i18next';
import { SUPPORT_EMAIL } from '@/constants/legalFacts';
import { styles } from '../_lib/styles';
import { buildSupportCategories, buildPriorityOptions } from '../_lib/constants';
import type { SupportFormController } from '../_hooks/useSupportForm';

/** Kategori + öncelik çipleri, form alanları ve iletişim bilgisi — her biri SectionCard. */
export function SupportForm({ f }: { f: SupportFormController }) {
  const { t } = useTranslation();
  const SUPPORT_CATEGORIES = buildSupportCategories(t);
  const PRIORITY_OPTIONS = buildPriorityOptions(t);
  return (
    <>
      <SectionCard title={t('support.new.selectCategory')}>
        <View style={styles.chips}>
          {SUPPORT_CATEGORIES.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              selected={f.category === cat.id}
              onPress={() => f.setCategory(cat.id)}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard title={t('support.priority')}>
        <View style={styles.chips}>
          {PRIORITY_OPTIONS.map((opt) => (
            <Chip
              key={opt.id}
              label={opt.name}
              selected={f.priority === opt.id}
              onPress={() => f.setPriority(opt.id)}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard>
        {(f.category === 'shipping' || f.category === 'trade') && (
          <Input
            label={t('support.new.orderNumberLabel')}
            value={f.orderId}
            onChangeText={f.setOrderId}
          />
        )}

        <Input label={t('support.new.subjectLabel')} value={f.subject} onChangeText={f.setSubject} />

        <Textarea
          label={t('support.new.descriptionLabel')}
          value={f.description}
          onChangeText={f.setDescription}
          rows={6}
        />

        <Text variant="caption" tone="muted">
          {t('support.new.requiredFieldsNote')}
        </Text>
      </SectionCard>

      <SectionCard title={t('support.new.contactInfoTitle')}>
        <View style={styles.userInfo}>
          <Text variant="bodySm">{f.user?.displayName}</Text>
          <Text variant="bodySm">{f.user?.email}</Text>
        </View>
      </SectionCard>

      <Text variant="bodySm" tone="muted">
        {t('support.new.urgentContact')}{' '}
        <Text variant="bodySm" tone="primary" weight="semibold">
          {SUPPORT_EMAIL}
        </Text>
      </Text>
    </>
  );
}
