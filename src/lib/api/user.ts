import { api } from "./client";

// User API - Web ile aynı endpoint'ler
export const userApi = {
  getProfile: () => api.get("/users/me"),
  updateProfile: (
    data:
      | {
          displayName?: string;
          phone?: string;
          bio?: string;
          birthDate?: string;
          avatarUrl?: string;
          companyName?: string;
          taxId?: string;
          taxOffice?: string;
          isCorporateSeller?: boolean;
          showTrustScore?: boolean;
        }
      | FormData,
  ) =>
    api.patch(
      "/users/me",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  /** Hesabı sil (kullanıcının kendi). Backend: DELETE /users/me */
  deleteAccount: () => api.delete("/users/me"),
  /** Değiştirilemez kullanıcı adını bir kez belirle — PATCH /users/me/username. */
  claimUsername: (username: string) =>
    api.patch<{ username: string; usernameClaimed: boolean }>("/users/me/username", { username }),
  /** İşletme dashboard istatistikleri — YALNIZ işletme hesapları (backend 400 döner aksi halde).
   *  Backend: GET /users/me/business-stats */
  getStats: () => api.get("/users/me/business-stats"),
  /** Tüm kullanıcılar için özet istatistik (ilan/sipariş/takas/koleksiyon sayıları,
   *  toplam harcama-gelir, puan). Backend: GET /users/me/stats */
  getSummaryStats: () => api.get("/users/me/stats"),
  /** İlanlarım için ürün-bazlı istatistik (backend: GET /products/my/stats) */
  getMyProductStats: () => api.get("/products/my/stats"),
  /** Analitik raporu — backend query parametresi `period` (7d|30d|90d) */
  getAnalytics: (params?: { period?: "7d" | "30d" | "90d" }) =>
    api.get("/users/me/analytics", { params }),
  /** Kullanıcının public profili — backend: GET /users/:id/profile */
  getPublicProfile: (userId: string) => api.get(`/users/${userId}/profile`),
  /** Kullanıcının takip durumu (sen onu takip ediyor musun?) — GET /users/:id/follow */
  getFollowStatus: (userId: string) => api.get(`/users/${userId}/follow`),
  /** Takip ettiklerim — GET /users/me/following */
  getMyFollowing: () => api.get("/users/me/following"),
  // Engelleme (Apple App Review 1.2: kalıcı, simetrik; web ile aynı uçlar —
  // sözleşme: ana repo `docs/USER_BLOCKING.md`).
  /** Hedefi engelledim mi? Menüde Engelle / Engeli Kaldır ayrımı için. */
  getBlockStatus: (userId: string) =>
    api.get<{ blocked: boolean }>(`/users/${userId}/block`),
  /** Engelle. `reason` yalnız admin bildiriminde görünür (≤500 karakter). */
  block: (userId: string, reason?: string) =>
    api.post(`/users/${userId}/block`, reason ? { reason } : {}),
  unblock: (userId: string) => api.delete(`/users/${userId}/block`),
  /** Engellediğim kullanıcılar */
  getBlockedUsers: () => api.get<BlockedUser[]>("/users/me/blocked"),
  follow: (userId: string) => api.post(`/users/${userId}/follow`),
  unfollow: (userId: string) => api.delete(`/users/${userId}/follow`),
  /** Satıcı vitrin görüntülenmesini artır — backend: POST /users/:id/view. Vitrin başına 1 kez çağrılmalı. */
  incrementStoreView: (userId: string) => api.post(`/users/${userId}/view`),
  /** İşletme satıcısına yükselt — backend: POST /users/me/seller */
  upgradeToSeller: (data: {
    companyName?: string;
    taxId?: string;
    taxOffice?: string;
  }) => api.post("/users/me/seller", data),
  /** Anasayfa "Haftanın Şirketi" — backend: GET /users/featured-business */
  getFeaturedBusiness: () => api.get("/users/featured-business"),
  /** Anasayfa "Haftanın Koleksiyoneri" */
  getFeaturedCollector: () => api.get("/users/featured-collector"),
  /** Top sellers (anasayfa fallback) */
  getTopSellers: (params?: { limit?: number }) =>
    api.get("/users/top-sellers", { params }),
  /** Top collections */
  getTopCollections: (params?: { limit?: number }) =>
    api.get("/users/top-collections", { params }),
};

/** `GET /users/me/blocked` satırı: public kimlik + engelleme zamanı. */
export interface BlockedUser {
  id: string;
  username?: string | null;
  displayName: string;
  companyName?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  sellerType?: string | null;
  blockedAt: string;
}

/** Kurumsal satıcı başvuru belgeleri — backend: /users/me/seller-documents */
export const sellerDocumentsApi = {
  /** Belge slotları (presigned URL'lerle). */
  list: () =>
    api.get<
      Array<{
        id: string;
        documentType: string;
        fileName: string;
        status: "pending" | "approved" | "rejected" | "revision_requested" | "appealed";
        uploadedAt: string;
        version?: number;
        reviewNote?: string | null;
        stakeholderId?: string | null;
        url?: string | null;
      }>
    >("/users/me/seller-documents"),
  /**
   * multipart/form-data: `file` + `documentType` (+ paydaş kimlik belgelerinde
   * `stakeholderId`). Kabul: application/pdf, jpeg, png, webp; ≤10 MB.
   */
  upload: (
    documentType: string,
    file: { uri: string; name: string; type: string },
    stakeholderId?: string,
  ) => {
    const formData = new FormData();
    formData.append("documentType", documentType);
    if (stakeholderId) formData.append("stakeholderId", stakeholderId);
    formData.append("file", file as unknown as Blob);
    return api.post("/users/me/seller-documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  /** Başvuru yoksa backend 400/404 döner — çağıran taraf "başvuru yok" olarak ele alır. */
  getApplication: () => api.get("/users/me/seller-documents/application"),
  updateApplication: (data: Record<string, string | undefined>) =>
    api.patch("/users/me/seller-documents/application", data),
  addStakeholder: (data: {
    fullName: string;
    identityType: "tckn" | "passport";
    identityNumber?: string;
  }) => api.post("/users/me/seller-documents/application/stakeholders", data),
  submit: () => api.post("/users/me/seller-documents/application/submit"),
  /** Belge kararına itiraz. */
  appeal: (documentId: string, note: string) =>
    api.post(`/users/me/seller-documents/${documentId}/appeal`, { note }),
};

// Seller Bank Account (IBAN) — backend: GET/PATCH/DELETE /users/me/bank-account
export const bankAccountApi = {
  get: () => api.get("/users/me/bank-account"),
  upsert: (data: {
    accountHolder: string;
    iban: string;
    tcKimlikNo?: string;
    taxId?: string;
  }) => api.patch("/users/me/bank-account", data),
  remove: () => api.delete("/users/me/bank-account"),
};

// User Reports API - İçerik raporlama
export const userReportsApi = {
  create: (data: {
    type: "product" | "user" | "collection" | "message";
    targetId: string;
    reason:
      | "spam"
      | "inappropriate_content"
      | "fake_product"
      | "scam"
      | "harassment"
      | "hate_speech"
      | "counterfeit"
      | "wrong_category"
      | "misleading_info"
      | "other";
    description?: string;
  }) => api.post("/user-reports", data),
  getMyReports: () => api.get("/user-reports/me"),
};
