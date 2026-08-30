import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { sellerDocumentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { REUPLOADABLE_STATUSES } from '../_lib/documents';
import {
  buildApplicationDetailsSchema,
  buildStakeholderSchema,
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

/** Başvuru sorgusu 400/404 döndüyse "henüz başvuru yok" demektir; başka bir hata değil. */
const isMissingStatus = (e: unknown) => {
  const status = (e as { response?: { status?: number } })?.response?.status;
  return status === 400 || status === 404;
};

/**
 * Kurumsal başvuru controller'ı — başvuru + belge sorgularını, üç mutation'ı
 * (detay kaydet, paydaş ekle, incelemeye gönder) ve sekme durumunu sahiplenir.
 *
 * Kilit kuralı: `under_review` iken formlar ve gönder devre dışı; `rejected` /
 * `revision_requested` belgeler için yükleme AÇIK kalır.
 */
export function useBusinessApplication() {
  const { t } = useTranslation();
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

  const detailsForm = useZodForm(buildApplicationDetailsSchema(t), {
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
      appAlert(t('businessApplication.detailsSavedTitle'), t('businessApplication.detailsSavedBody'));
    },
    onError: (e) => appAlert(t('common.error'), errorText(e, t('businessApplication.detailsSaveFailed'))),
  });

  const stakeholderForm = useZodForm(buildStakeholderSchema(t), {
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
      appAlert(t('businessApplication.stakeholderAddedTitle'), t('businessApplication.stakeholderAddedBody'));
    },
    onError: (e) => appAlert(t('common.error'), errorText(e, t('businessApplication.stakeholderAddFailed'))),
  });

  const submitMutation = useMutation({
    mutationFn: () => sellerDocumentsApi.submit(),
    onSuccess: () => {
      invalidate();
      appAlert(t('businessApplication.submittedTitle'), t('businessApplication.submittedBody'));
    },
    onError: (e) => appAlert(t('businessApplication.submitFailedTitle'), errorText(e, t('businessApplication.submitFailed'))),
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
    /** Backend 400/404 → henüz başvuru oluşmamış. Diğer hatalar `loadError`'a düşer. */
    isMissing: isMissingStatus(applicationQuery.error),
    /** 400/404 dışındaki hatalar (500, ağ hatası, ...) — "başvuru yok" değil, gerçek hata. */
    loadError: applicationQuery.isError && !isMissingStatus(applicationQuery.error),
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
