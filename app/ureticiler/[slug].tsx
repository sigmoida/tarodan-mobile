import { EntityProductsScreen } from '@/components/catalog/EntityProductsScreen';

/** `/ureticiler/:slug` — üreticinin ürünleri (web `/manufacturers/[slug]`). */
export default function ManufacturerDetailScreen() {
  return <EntityProductsScreen kind="manufacturer" />;
}
