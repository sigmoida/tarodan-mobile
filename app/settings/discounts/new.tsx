import { useTranslation } from 'react-i18next';
import { DiscountsGate } from './_components/DiscountsGate';
import { DiscountForm } from './_components/DiscountForm';

/** Yeni indirim — düz stack ekranı (liste FAB'ı iter). Form `DiscountForm`'da (PageShell). */
export default function NewDiscountScreen() {
  const { t } = useTranslation();
  const gate = DiscountsGate({ title: t('discount.newTitle') });
  if (gate) return gate;
  return <DiscountForm discount={null} />;
}
