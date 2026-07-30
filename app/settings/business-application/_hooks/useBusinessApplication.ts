import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { sellerDocumentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { REUPLOADABLE_STATUSES } from '../_lib/documents';
import {
  applicationDetailsSchema,
  stakeholderSchema,
  type ApplicationDetailsForm,
  type StakeholderForm,
} from '../_lib/schema';
import type { CorporateApplication, SellerDocument } from '../_lib/types';

export type BusinessApplicationTab = 'details' | 'stakeholders' | 'documents';

/** Sunucu hata mesajı string veya string[] olabilir (NestJS doğrulama dizisi). */
const errorText = (e: unknown, fallback: string) => {
  const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  return Array.isArray(raw) ? raw.join('\n') : raw || fallback;
};

/**
 * Kurumsal başvuru controller'ı — başvuru + belge sorgularını, üç mutation'ı
 * (detay kaydet, paydaş ekle, incelemeye gönder) ve sekme durumunu sahiplenir.
 *
 * Kilit kuralı: `under_review` iken formlar ve gönder devre dışı; `rejected` /
 * `revision_requested` belgeler için yükleme AÇIK kalır.
 */
export function useBusinessApplication() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<BusinessApplicationTab>('details');

  const applicationQuery = useQuery({
    queryKey: qk.sellerDocuments.application,
    queryFn: async () =>
      (await sellerDocumentsApi.getApplication()).data as CorporateApplication,
    retry: false,
  });

  const documentsQuery = useQuery({
    queryKey: qk.sellerDocuments.list,
    queryFn: async () => (await sellerDocumentsApi.list()).data as SellerDocument[],
  });

  const application = applicationQuery.data;
  const documents = documentsQuery.data ?? [];
  const stakeholders = application?.stakeholders ?? [];
  const isLocked = application?.status === 'under_review';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.application });
    queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.list });
  };

  const detailsForm = useZodForm(applicationDetailsSchema, {
    values: {
      companyType: application?.companyType ?? '',
      taxId: application?.taxId ?? '',
      taxOffice: application?.taxOffice ?? '',
      companyCity: application?.companyCity ?? '',
      companyDistrict: application?.companyDistrict ?? '',
      bankAccountHolder: application?.bankAccountHolder ?? '',
      iban: application?.iban ?? '',
    },
  });

  const detailsMutation = useMutation({
    mutationFn: (values: ApplicationDetailsForm) =>
      // Boş alanları gönderme — backend kısmi güncelleme yapıyor.
      sellerDocumentsApi.updateApplication(
        Object.fromEntries(
          Object.entries(values).filter(([, v]) => typeof v === 'string' && v !== ''),
        ) as Record<string, string>,
      ),
    onSuccess: () => {
      invalidate();
      appAlert('Kaydedildi', 'Şirket bilgileri güncellendi.');
    },
    onError: (e) => appAlert('Hata', errorText(e, 'Bilgiler kaydedilemedi.')),
  });

  const stakeholderForm = useZodForm(stakeholderSchema, {
    defaultValues: { fullName: '', identityType: 'tckn', identityNumber: '' },
  });

  const stakeholderMutation = useMutation({
    mutationFn: (values: StakeholderForm) =>
      sellerDocumentsApi.addStakeholder({
        fullName: values.fullName,
        identityType: values.identityType,
        ...(values.identityNumber ? { identityNumber: values.identityNumber } : {}),
      }),
    onSuccess: () => {
      invalidate();
      stakeholderForm.reset({ fullName: '', identityType: 'tckn', identityNumber: '' });
      appAlert('Eklendi', 'Şirket sahibi/ortağı eklendi.');
    },
    onError: (e) => appAlert('Hata', errorText(e, 'Paydaş eklenemedi.')),
  });

  const submitMutation = useMutation({
    mutationFn: () => sellerDocumentsApi.submit(),
    onSuccess: () => {
      invalidate();
      appAlert('Gönderildi', 'Başvurunuz incelemeye alındı.');
    },
    onError: (e) => appAlert('Gönderilemedi', errorText(e, 'Başvuru gönderilemedi.')),
  });

  /** Bir belge türünün (paydaş kimliğinde stakeholderId ile) yüklenmiş kaydı. */
  const documentFor = (documentType: string, stakeholderId?: string) =>
    documents.find(
      (d) =>
        d.documentType === documentType &&
        (stakeholderId ? d.stakeholderId === stakeholderId : !d.stakeholderId),
    );

  /**
   * Yükleme açık mı? Henüz yüklenmemiş belge yalnız başvuru kilitli DEĞİLKEN
   * yüklenebilir; yüklenmiş belge ise reddedilmiş/düzeltme istenmiş olduğunda
   * (başvuru kilitli olsa bile) yeniden yüklenebilir.
   */
  const canUpload = (doc?: SellerDocument) =>
    doc ? REUPLOADABLE_STATUSES.includes(doc.status) : !isLocked;

  return {
    application,
    documents,
    stakeholders,
    isLoading: applicationQuery.isLoading || documentsQuery.isLoading,
    /** Backend 400/404 → henüz başvuru oluşmamış. */
    isMissing: applicationQuery.isError,
    isLocked,
    tab,
    setTab,
    detailsForm,
    saveDetails: detailsForm.handleSubmit((v) => detailsMutation.mutate(v)),
    isSavingDetails: detailsMutation.isPending,
    stakeholderForm,
    addStakeholder: stakeholderForm.handleSubmit((v) => stakeholderMutation.mutate(v)),
    isAddingStakeholder: stakeholderMutation.isPending,
    submitApplication: () => submitMutation.mutate(),
    isSubmitting: submitMutation.isPending,
    documentFor,
    canUpload,
  };
}
