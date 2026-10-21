import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalFooter } from '@/ui';
import { Form, FormInput, useZodForm } from '@/ui/form';
import { useDoSaveSearch } from '../_hooks/useDoSaveSearch';
import { buildSaveSearchSchema, type SaveSearchForm } from '../_lib/saveSearchSchema';
import type { SavedSearchDraft } from '../_lib/savedSearch';

/**
 * "Save this search" dialog: a name field prefilled with the automatic name (web `SaveSearchModal`).
 * Owns its form and its mutation. It closes BEFORE the save fires, so the 409 / 403 feedback is a
 * toast / alert after it (`useDoSaveSearch`), not an inline message (iOS modal rule).
 */
export function SaveSearchModal({
  draft,
  isOpen,
  onClose,
}: {
  draft: SavedSearchDraft;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildSaveSearchSchema(t), [t]);
  const form = useZodForm(schema, { defaultValues: { name: draft.defaultName } });
  const save = useDoSaveSearch();

  // Refill the automatic name every time the dialog opens (the search may have changed meanwhile).
  useEffect(() => {
    if (isOpen) form.reset({ name: draft.defaultName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onSubmit = form.handleSubmit(({ name }: SaveSearchForm) => {
    onClose();
    save.mutate({ draft, name });
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('savedSearch.saveTitle')}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={onSubmit}
          confirmLabel={t('common.save')}
          confirmTestID="save-search-submit"
        />
      }
    >
      <Form form={form}>
        <FormInput testID="save-search-name" name="name" label={t('savedSearch.nameLabel')} />
      </Form>
    </Modal>
  );
}
