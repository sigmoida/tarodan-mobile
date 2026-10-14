import { router } from 'expo-router';

// Arama ekranı yığın rotası (`/search`): her `push` taze bir ekran kurar ve filtreler URL
// parametrelerinden başlatılır — eski kalıcı sekmenin `navToken` hilesi gerekmez.
export const goSearch = (query: string) => {
  if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`);
};

// Anasayfa "Markalar" şeridi aslında üreticiler — web menüsüyle aynı: id (API süzgeci, ad
// eşleşmesinden bağımsız) + ad (aktif filtre çipi etiketi) birlikte.
export const goBrand = (brand: { id: string; name: string }) =>
  router.push({
    pathname: '/search',
    params: brand.id ? { manufacturer: brand.name, manufacturerId: brand.id } : { manufacturer: brand.name },
  });

export const goCategory = (cat: { id: string; name: string }) =>
  router.push(`/search?categoryId=${encodeURIComponent(cat.id)}&category=${encodeURIComponent(cat.name)}`);
