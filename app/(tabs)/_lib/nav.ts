import { router } from 'expo-router';

// Arama ekranı yığın rotası (`/search`): her `push` taze bir ekran kurar ve filtreler URL
// parametrelerinden başlatılır — eski kalıcı sekmenin `navToken` hilesi gerekmez.
export const goSearch = (query: string) => {
  if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`);
};

export const goScale = (scale: string) => router.push(`/search?scale=${encodeURIComponent(scale)}`);

// Anasayfa "Markalar" şeridi aslında üreticiler — web ile aynı: manufacturer ismi ile filtrele.
export const goBrand = (brand: { id: string; name: string }) =>
  router.push(`/search?manufacturer=${encodeURIComponent(brand.name)}`);

export const goCategory = (cat: { id: string; name: string }) =>
  router.push(`/search?categoryId=${encodeURIComponent(cat.id)}&category=${encodeURIComponent(cat.name)}`);
