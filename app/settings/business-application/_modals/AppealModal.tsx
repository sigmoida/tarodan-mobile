import { StyleSheet } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter, Text, appAlert, toast, theme } from '@/ui';
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
      toast.success(t('businessApplication.appealSentBody'));
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
    <Modal
      isOpen={!!documentId}
      onClose={onClose}
      title={t('businessApplication.appealCta')}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={onSubmit}
          confirmLabel={t('common.send')}
          confirmTestID="appeal-submit"
        />
      }
    >
      <Text variant="caption" tone="muted" style={styles.hint}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: theme.spacing[3] },
});
