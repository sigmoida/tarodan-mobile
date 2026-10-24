import { router } from 'expo-router';

// The search screen is a stack route (`/search`): every `push` builds a fresh screen and the
// filters start from the URL params. Free text is written as `search`, the web name (the screen
// still reads the legacy `q` too).
export const goSearch = (query: string) => {
  if (query.trim()) router.push(`/search?search=${encodeURIComponent(query)}`);
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
