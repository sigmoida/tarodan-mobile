import ListingForm from '@/components/listing/ListingForm';
import { tabDiag } from '@/components/_tabDiag';

// Yeni ilan oluşturma ekranı. Form mantığı ortak <ListingForm> bileşeninde;
// create + edit aynı kaynağı kullanır (web paritesi).
function SellScreen() {
  return <ListingForm mode="create" />;
}

export default tabDiag('sell', SellScreen);
