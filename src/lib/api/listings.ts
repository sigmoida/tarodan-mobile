import { api } from './client';
import { apiPath } from './path';

// Wishlist API - Web ile aynı endpoint'ler
export const wishlistApi = {
  get: () => api.get('/wishlist'),
  add: (productId: string) => api.post('/wishlist', { productId }),
  remove: (productId: string) => api.delete(apiPath`/wishlist/${productId}`),
  check: (productId: string) => api.get(apiPath`/wishlist/check/${productId}`),
  clear: () => api.delete('/wishlist'),
};
