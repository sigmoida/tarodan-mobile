import { Redirect, useLocalSearchParams } from 'expo-router';
import { searchHref } from '@/lib/navigation/searchHref';

/**
 * `/listings` — eski "Tüm ilanlar" liste ekranı. Filtreli/sıralı listeler artık arama ekranıdır
 * (`/search?…`, aynı web parametre adları). Derin bağlantı, push ve reklam yolları `toMobileRoute` /
 * `resolveAdLink` içinde zaten `/search`'e çevrilir; bu dosya kalan her yol (eski kayıtlı adres,
 * doğrudan `router.push('/listings?…')`) 404 vermesin diye yönlendirme olarak kalır.
 */
export default function ListingsRedirect() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  return <Redirect href={searchHref(params)} />;
}
