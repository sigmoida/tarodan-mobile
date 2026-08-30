import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supportApi } from '@/lib/api';
import { UUID_RE } from '../_lib/constants';

/**
 * Support-ticket controller — owns the ticket form fields + validation (subject
 * ≥5, message ≥10) and the create-ticket submit (order/trade UUID handling).
 * Lifted verbatim from the monolithic screen (§12).
 */
export function useSupportForm() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleSubmit = async () => {
    if (!category || !subject || !description) {
      setSnackbar({ visible: true, message: t('auth.fillRequiredFields') });
      return;
    }

    // Backend DTO ile parite (CreateTicketDto): subject @MinLength(5), message @MinLength(10).
    if (subject.trim().length < 5) {
      setSnackbar({ visible: true, message: t('support.new.subjectMinLength') });
      return;
    }
    if (description.trim().length < 10) {
      setSnackbar({ visible: true, message: t('support.new.descriptionMinLength') });
      return;
    }

    // orderId/tradeId backend'de UUID bekler; serbest metin girildiyse mesaja ekle.
    const refId = orderId.trim();
    const isUuid = UUID_RE.test(refId);
    let message = description.trim();
    if (refId && !isUuid) {
      message = `${t('support.new.refPrefix', { refId })}\n\n${message}`;
    }

    setLoading(true);
    try {
      await supportApi.createTicket({
        subject: subject.trim(),
        category,
        priority,
        message,
        ...(isUuid && category === 'trade' ? { tradeId: refId } : {}),
        ...(isUuid && category !== 'trade' ? { orderId: refId } : {}),
      });

      setSnackbar({ visible: true, message: t('support.new.ticketCreated') });

      // Reset form
      setCategory('');
      setSubject('');
      setDescription('');
      setOrderId('');
      setPriority('medium');
    } catch {
      setSnackbar({ visible: true, message: t('support.new.createFailed') });
    } finally {
      setLoading(false);
    }
  };

  return {
    isAuthenticated,
    user,
    category,
    setCategory,
    priority,
    setPriority,
    subject,
    setSubject,
    description,
    setDescription,
    orderId,
    setOrderId,
    loading,
    snackbar,
    setSnackbar,
    handleSubmit,
  };
}

export type SupportFormController = ReturnType<typeof useSupportForm>;
