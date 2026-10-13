import ListingForm from '@/components/listing/ListingForm';
import { AppShell } from '@/components/shell/AppShell';
import { tabDiag } from '@/components/_tabDiag';

// Yeni ilan oluşturma ekranı (sekme kökü → AppShell marka barı). Form mantığı ortak
// <ListingForm> bileşeninde; create + edit aynı kaynağı kullanır (web paritesi). Edit modu kendi
// beyaz üst barını (PageShell) ListingForm içinde çizer.
function SellScreen() {
  return (
    <AppShell>
      <ListingForm mode="create" />
    </AppShell>
  );
}

export default tabDiag('sell', SellScreen);
