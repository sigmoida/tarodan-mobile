// User types
export * from './user';

// Product types
export * from './product';

// Order types
export * from './order';

// Offer types
export * from './offer';

// Trade types
export * from './trade';

// The ceiling of an agreed amount: offer, counter-offer, trade cash (vendored from tarodan-app
// `packages/types`)
export * from './negotiated-amount';

// Message types
export * from './message';

// WebSocket types
export * from './websocket';

// Notification types
export * from './notification';

// Wishlist & Collection types
export * from './wishlist';

// Rating types
export * from './rating';

// Support types
export * from './support';

// Admin types
export * from './admin';

// Seller trust score types
export * from './seller-trust';

// Product search: the GET /products price filter bound (vendored from tarodan-app `packages/types`)
export * from './product-search';

// Saved searches (vendored from tarodan-app `packages/types`)
export * from './saved-search';

// Listing boost shapes and the listing card action rule (vendored from tarodan-app `packages/types`)
export * from './boost';
export * from './product-card-action';

// Common types
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, any>;
}
