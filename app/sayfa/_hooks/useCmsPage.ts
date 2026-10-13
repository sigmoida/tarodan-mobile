import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { qk } from '@/lib/query';
import { pagesApi } from '@/lib/api';
import { unwrapEnvelope } from '@/utils/apiEnvelope';

export interface CmsPageData {
  title: string;
  content: string;
  updatedAt?: string;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

/**
 * CMS sayfası — React Query (CLAUDE.md §6). Aynı slug ikinci kez açıldığında önbellekten gelir;
 * 404 ile diğer hatalar ayrı mesaj alır (mevcut davranış). Önceki ekrandan AYNEN taşındı.
 */
export function useCmsPage() {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const query = useQuery({
    queryKey: qk.catalog.pages(slug),
    enabled: !!slug,
    retry: false,
    queryFn: async (): Promise<CmsPageData> =>
      unwrapEnvelope<CmsPageData>(await pagesApi.getBySlug(slug)),
  });

  const page = query.data ?? null;
  const error = query.error
    ? (query.error as { response?: { status?: number } })?.response?.status === 404
      ? t('cmsPage.notFound')
      : t('cmsPage.loadError')
    : '';
  const updated = formatDate(page?.updatedAt);

  return {
    t,
    page,
    loading: query.isLoading,
    error,
    retry: () => query.refetch(),
    subtitle: updated ? t('cmsPage.lastUpdatedOn', { date: updated }) : undefined,
  };
}
