import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Text, appAlert, theme } from '@/ui';
import { Form, FormInput, useZodForm } from '@/ui/form';
import { sellerDocumentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { appealSchema, type AppealForm } from '../_lib/schema';

type Props = { documentId: string | null; onClose: () => void };

/**
 * Belge kararına itiraz. Kendi form + mutation'ını sahiplenir.
 * ⚠️ appAlert modal AÇIKKEN çalışırsa iOS donuyor → modal mutation'dan ÖNCE kapanır.
 */
export function AppealModal({ documentId, onClose }: Props) {
  const queryClient = useQueryClient();
  const form = useZodForm(appealSchema);

  const mutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      sellerDocumentsApi.appeal(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.list });
      appAlert('İtiraz gönderildi', 'İtirazınız incelemeye alındı.');
    },
    onError: (e: unknown) => {
      const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      appAlert('Hata', Array.isArray(raw) ? raw.join('\n') : raw || 'İtiraz gönderilemedi.');
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
    <Modal isOpen={!!documentId} onClose={onClose} title="Karara itiraz et">
      <Text variant="caption" tone="muted" style={{ marginBottom: theme.spacing[3] }}>
        Belgenin neden geçerli olduğunu kısaca açıklayın.
      </Text>
      <Form form={form}>
        <FormInput
          testID="appeal-note"
          name="note"
          label="İtiraz notu"
          multiline
          numberOfLines={4}
        />
      </Form>
      <Button testID="appeal-submit" onPress={onSubmit}>Gönder</Button>
    </Modal>
  );
}
