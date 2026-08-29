import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Text, appAlert, theme } from '@/ui';
import { Form, FormInput, useZodForm } from '@/ui/form';
import { sellerDocumentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { buildAppealSchema, type AppealForm } from '../_lib/schema';

type Props = { documentId: string | null; onClose: () => void };

/**
 * Belge kararına itiraz. Kendi form + mutation'ını sahiplenir.
 * ⚠️ appAlert modal AÇIKKEN çalışırsa iOS donuyor → modal mutation'dan ÖNCE kapanır.
 */
export function AppealModal({ documentId, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const form = useZodForm(buildAppealSchema(t));

  const mutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      sellerDocumentsApi.appeal(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.list });
      appAlert(t('businessApplication.appealSentTitle'), t('businessApplication.appealSentBody'));
    },
    onError: (e: unknown) => {
      const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      appAlert(t('common.error'), Array.isArray(raw) ? raw.join('\n') : raw || t('businessApplication.appealFailed'));
    },
  });

  const onSubmit = form.handleSubmit((values: AppealForm) => {
    const id = documentId;
    if (!id) return;
    // Modal'ı mutation'dan ÖNCE kapat (iOS donma tuzağı).
    onClose();
    form.reset();
    mutation.mutate({ id, note: values.note });
  });

  return (
    <Modal isOpen={!!documentId} onClose={onClose} title={t('businessApplication.appealCta')}>
      <Text variant="caption" tone="muted" style={{ marginBottom: theme.spacing[3] }}>
        {t('businessApplication.appealModalHint')}
      </Text>
      <Form form={form}>
        <FormInput
          testID="appeal-note"
          name="note"
          label={t('businessApplication.appealNoteLabel')}
          multiline
          numberOfLines={4}
        />
      </Form>
      <Button testID="appeal-submit" onPress={onSubmit}>{t('common.send')}</Button>
    </Modal>
  );
}
