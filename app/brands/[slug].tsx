import { EntityProductsScreen } from '@/components/catalog/EntityProductsScreen';

/** `/brands/:slug` — markanın ürünleri (araba markası: web'de karşılığı yok, deep link korunur). */
export default function BrandDetailScreen() {
  return <EntityProductsScreen kind="brand" />;
}
