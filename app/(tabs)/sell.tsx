import { useTranslation } from 'react-i18next';
import ListingForm from '@/components/listing/ListingForm';
import { AppShell } from '@/components/shell/AppShell';
import { tabDiag } from '@/components/_tabDiag';

// Yeni ilan oluşturma ekranı (sekme kökü → AppShell başlıklı beyaz bar). Form mantığı ortak
// <ListingForm> bileşeninde; create + edit aynı kaynağı kullanır (web paritesi). Edit modu kendi
// beyaz üst barını (PageShell) ListingForm içinde çizer.
function SellScreen() {
  const { t } = useTranslation();
  return (
    <AppShell variant="title" title={t('nav.newListing')}>
      <ListingForm mode="create" />
    </AppShell>
  );
}

export default tabDiag('sell', SellScreen);
