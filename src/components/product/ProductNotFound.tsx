import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { PageShell, type PageShellProps } from '@/components/common/PageShell';
import { goBackOrHome } from '@/components/common/goBackOrHome';

/** The "listing not found" empty state: one copy for an unknown id and for an unreadable URL segment. */
export function productNotFoundState(t: TFunction, onAction: () => void): NonNullable<PageShellProps['emptyState']> {
  return {
    icon: 'cube',
    title: t('product.productNotFoundTitle'),
    subtitle: t('emptyState.notFoundHint'),
    actionLabel: t('common.goBack'),
    onAction,
  };
}

/** A listing route whose param holds no listing uuid (garbage or a truncated link): no request is made. */
export function ProductNotFound() {
  const { t } = useTranslation();
  return <PageShell header={false} mode="list" padding={false} empty emptyState={productNotFoundState(t, goBackOrHome)} />;
}
