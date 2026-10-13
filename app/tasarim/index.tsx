import { Redirect } from 'expo-router';
import { PageShell } from '@/components/common/PageShell';
import { shouldShowDiagnostics } from '@/config/diagnostics';
import { Showcase } from './_components/Showcase';
import { SheetShowcase } from './_components/SheetShowcase';

/**
 * /tasarim — @/ui tasarım vitrini. YALNIZ geliştirme ve staging/preview build'lerinde açılır
 * (`shouldShowDiagnostics`, ErrorBoundary teşhisiyle aynı kapı). Production'da derin
 * bağlantıyla gelinse bile ana sayfaya yönlenir.
 *
 * Not: expo-router `_` önekli klasörleri rotadan gizlediği için ad `/_tasarim` değil `/tasarim`.
 */
export default function DesignShowcaseScreen() {
  if (!shouldShowDiagnostics()) return <Redirect href="/" />;
  return (
    <PageShell title="Tasarım">
      <Showcase />
      <SheetShowcase />
    </PageShell>
  );
}
