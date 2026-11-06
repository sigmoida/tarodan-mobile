import { api, guestApi } from './client';
import { apiPath } from './path';
import { MEDIA_UPLOAD_TIMEOUT_MS } from './media';
import { appendRNFile } from './formData';

// Categories API - Web ile aynı endpoint'ler
export const categoriesApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/categories', { params }),
  getOne: (id: string) =>
    api.get(apiPath`/categories/${id}`),
  getBySlug: (slug: string) =>
    api.get(apiPath`/categories/slug/${slug}`),
};

/** A marketplace listing for a collection. */
export interface AddCollectionListingBody {
  productId: string;
  sortOrder?: number;
  isFeatured?: boolean;
}

/**
 * A custom item: a model the owner enters by hand (`AddCollectionItemDto` limits: title 1..200,
 * description <= 1000, brand/model/manufacturer <= 100, scale/material <= 50, year 1900..2100).
 * `customImageUrl` is the URL `mediaApi.uploadCollectionImage` returned.
 */
export interface AddCollectionCustomItemBody {
  customTitle: string;
  customDescription?: string;
  customBrand?: string;
  customModel?: string;
  customYear?: number;
  customScale?: string;
  customManufacturer?: string;
  customMaterial?: string;
  customImageUrl?: string;
}

export type AddCollectionItemBody = AddCollectionListingBody | AddCollectionCustomItemBody;

// Collections API - Web ile aynı endpoint'ler
export const collectionsApi = {
  browse: (params?: Record<string, any>) =>
    api.get('/collections/browse', { params }),
  getMyCollections: (params?: Record<string, any>) =>
    api.get('/collections/me', { params }),
  getLikedCollections: (params?: Record<string, any>) =>
    api.get('/collections/liked', { params }),
  getOne: (id: string) =>
    api.get(apiPath`/collections/${id}`),
  getBySlug: (slug: string) =>
    api.get(apiPath`/collections/slug/${slug}`),
  getUserCollections: (userId: string, params?: Record<string, any>) =>
    api.get(apiPath`/collections/user/${userId}`, { params }),
  // DTO alanı `coverImageKey` (S3 key); dosya yüklemek için PATCH /collections/:id/cover kullanılır.
  create: (data: { name: string; description?: string; coverImageKey?: string; isPublic?: boolean; categoryId?: string }) =>
    api.post('/collections', data),
  update: (id: string, data: { name?: string; description?: string; coverImageKey?: string; isPublic?: boolean; categoryId?: string | null }) =>
    api.patch(apiPath`/collections/${id}`, data),
  /** Kapak görseli yükle/değiştir — multipart, alan adı `cover` */
  updateCover: (id: string, file: { uri: string; name: string; type: string }) => {
    const formData = new FormData();
    appendRNFile(formData, 'cover', file);
    return api.patch(apiPath`/collections/${id}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: MEDIA_UPLOAD_TIMEOUT_MS,
    });
  },
  delete: (id: string) =>
    api.delete(apiPath`/collections/${id}`),
  addItem: (id: string, data: AddCollectionItemBody) =>
    api.post(apiPath`/collections/${id}/items`, data),
  removeItem: (id: string, itemId: string) =>
    api.delete(apiPath`/collections/${id}/items/${itemId}`),
  like: (id: string) =>
    api.post(apiPath`/collections/${id}/like`),
  unlike: (id: string) =>
    api.delete(apiPath`/collections/${id}/like`),
};

/** Destek / İletişim */
export const supportApi = {
  guestContact: (data: { name: string; email: string; message: string; subject?: string }) =>
    guestApi.post('/support/contact', data),
  createTicket: (data: {
    subject: string;
    category: string;
    priority?: string;
    message: string;
    orderId?: string;
    tradeId?: string;
    attachments?: string[];
  }) => api.post('/support/tickets', data),
  getMyTickets: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get('/support/tickets/me', { params }),
  getTicket: (id: string) => api.get(apiPath`/support/tickets/${id}`),
  addMessage: (id: string, data: { content: string; attachments?: string[] }) =>
    api.post(apiPath`/support/tickets/${id}/messages`, data),
};
