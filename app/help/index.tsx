import { ContentPage } from '@/components/content/ContentPage';
import { useHelp } from './_hooks/useHelp';
import { HelpFaq } from './_components/HelpFaq';
import { HelpContact } from './_components/HelpContact';

/**
 * Yardım merkezi — İNCE ekran. `useHelp` denetleyicisi SSS arama/akordeon durumunu, iletişim formunu
 * (doğrulama + gönderim) ve toast geri bildirimini yönetir; bu dosya yalnız bölümleri kurar.
 */
export default function HelpScreen() {
  const f = useHelp();

  return (
    <ContentPage title={f.t('mobile.pageHelpCenter')}>
      <HelpFaq f={f} />
      <HelpContact f={f} />
    </ContentPage>
  );
}
