import ListingForm from '@/components/listing/ListingForm';
import { AppShell } from '@/components/shell/AppShell';
import { tabDiag } from '@/components/_tabDiag';

// Yeni ilan oluşturma ekranı (sekme kökü → AppShell, diğer köklerle aynı üst bar). Form mantığı
// ortak <ListingForm> bileşeninde; create + edit aynı kaynağı kullanır (web paritesi).
function SellScreen() {
  return (
    <AppShell>
      <ListingForm mode="create" embedded />
    </AppShell>
  );
}

export default tabDiag('sell', SellScreen);
