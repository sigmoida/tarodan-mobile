import { useLocalSearchParams } from 'expo-router';
import { listingIdFromParam } from '@/lib/product/listingParam';
import { ProductNotFound } from '@/components/product';
import ListingForm from '@/components/listing/ListingForm';

// Listing edit screen. The form logic is the shared <ListingForm> (same as create).
export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // `[id]` may be a `<slug>-<uuid>` segment: the form loads and saves by the uuid.
  const productId = listingIdFromParam(id);
  return productId ? <ListingForm mode="edit" productId={productId} /> : <ProductNotFound />;
}
