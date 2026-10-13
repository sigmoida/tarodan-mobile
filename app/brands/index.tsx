import { Redirect } from 'expo-router';

/**
 * `/brands` — eski "Markalar" listesi. Web'de tek "Üreticiler" sayfası var; liste artık
 * `/ureticiler`. Eski bağlantılar (reklam, deep link) kopmasın diye yönlendirme olarak kalır.
 */
export default function BrandsIndexRedirect() {
  return <Redirect href="/ureticiler" />;
}
