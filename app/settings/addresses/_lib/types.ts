export interface Address {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
  zipCode?: string; // API bu alanı döndürüyor
  isDefault: boolean;
}

/** Adres formu rotaları (liste → yeni / düzenle, düz stack push). */
export const addressRoutes = {
  new: '/settings/addresses/new',
  edit: (id: string) => `/settings/addresses/${id}/edit`,
} as const;
