import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useZodForm } from '@/ui/form';
import { sellerDocumentsApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { REUPLOADABLE_STATUSES } from '../_lib/documents';
import {
  buildApplicationDetailsSchema,
  buildStakeholderSchema,
  type ApplicationDetailsForm,
  type StakeholderForm,
} from '../_lib/schema';
import type { CorporateApplication, SellerDocument } from '../_lib/types';

export type BusinessApplicationTab = 'details' | 'stakeholders' | 'documents';

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

  const applicationKeys = [qk.sellerDocuments.application, qk.sellerDocuments.list] as const;

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

  const detailsMutation = useAppMutation(
    (values: ApplicationDetailsForm) =>
      // Boş alanları gönderme — backend kısmi güncelleme yapıyor.
      sellerDocumentsApi.updateApplication(
        Object.fromEntries(
          Object.entries(values).filter(([, v]) => typeof v === 'string' && v !== ''),
        ) as Record<string, string>,
      ),
    {
      invalidates: applicationKeys,
      success: t('businessApplication.detailsSavedBody'),
      error: t('businessApplication.detailsSaveFailed'),
    },
  );

  const stakeholderForm = useZodForm(buildStakeholderSchema(t), {
    defaultValues: { fullName: '', identityType: 'tckn', identityNumber: '' },
  });

  const stakeholderMutation = useAppMutation(
    (values: StakeholderForm) =>
      sellerDocumentsApi.addStakeholder({
        fullName: values.fullName,
        identityType: values.identityType,
        ...(values.identityNumber ? { identityNumber: values.identityNumber } : {}),
      }),
    {
      invalidates: applicationKeys,
      success: t('businessApplication.stakeholderAddedBody'),
      error: t('businessApplication.stakeholderAddFailed'),
      onSuccess: () =>
        stakeholderForm.reset({ fullName: '', identityType: 'tckn', identityNumber: '' }),
    },
  );

  const submitMutation = useAppMutation(() => sellerDocumentsApi.submit(), {
    invalidates: applicationKeys,
    success: t('businessApplication.submittedBody'),
    error: t('businessApplication.submitFailed'),
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
