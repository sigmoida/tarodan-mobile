/**
 * J68/J133 · İlanlarım ekranı (settings/my-listings) — mobil UI dilimi.
 * Durum filtre chip'leri (sayaçlı render + seçim), "Reddedildi" durum rozeti,
 * eylem menüsü → "Düzenle" navigasyon wiring (router.push /listing/:id/edit).
 * Backend (ilan durum geçişleri, relist limiti, deaktif/sil kalıcılığı) backendOnly.
 */
import React from "react";
import { screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: {
    push: (...a: any[]) => mockPush(...a),
    back: jest.fn(),
    replace: jest.fn(),
  },
  useFocusEffect: (cb: any) => cb(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({
    user: { listingCount: 2, membershipTier: "free" },
    limits: { maxListings: 10 },
    refreshUserData: jest.fn(),
  });
    return sel ? sel(state) : state;
  },
}));

// BoostModal native bağımlılıklarını izole et — UI dilimi dışı.
jest.mock("@/components/product/BoostModal", () => ({
  BoostModal: () => null,
}));

const mockGetMyListings = jest.fn();
const mockGetMyStats = jest.fn();
jest.mock("@/lib/api", () => ({
  errorText: (_e: unknown, fallback: string) => fallback,
  productsApi: {
    getMyListings: (...a: any[]) => mockGetMyListings(...a),
    getMyStats: (...a: any[]) => mockGetMyStats(...a),
    update: jest.fn(),
    delete: jest.fn(),
    deactivate: jest.fn(),
    renew: jest.fn(),
    renewMany: jest.fn(),
  },
}));

import MyListingsScreen from "../my-listings";

function listing(overrides: Record<string, unknown> = {}) {
  return {
    id: "L1",
    title: "Hot Wheels Camaro",
    price: 250,
    status: "active",
    viewCount: 12,
    likeCount: 3,
    images: [],
    createdAt: new Date("2026-01-01").toISOString(),
    updatedAt: new Date("2026-01-01").toISOString(),
    condition: "good",
    ...overrides,
  };
}

function wireStats() {
  mockGetMyStats.mockResolvedValue({
    data: {
      counts: {
        all: 3,
        active: 1,
        pending: 0,
        sold: 1,
        reserved: 0,
        rejected: 1,
        inactive: 0,
      },
    },
  });
}

describe("J68 · İlanlarım filtre chip + durum rozeti", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGetMyListings.mockReset();
    mockGetMyStats.mockReset();
    wireStats();
  });

  it("J68.1 filtre chip'leri sunucu sayaçlarıyla render olur (Tümü/Reddedildi)", async () => {
    mockGetMyListings.mockResolvedValue({ data: { data: [listing()] } });
    renderWithProviders(<MyListingsScreen />);
    expect(await screen.findByText("listing.filterAll (3)")).toBeOnTheScreen();
    expect(screen.getByText("listing.filterRejected (1)")).toBeOnTheScreen();
    expect(screen.getByText("listing.filterActive (1)")).toBeOnTheScreen();
  });

  it('J68.2 reddedilen ilan → "Reddedildi" durum rozeti gösterilir', async () => {
    mockGetMyListings.mockResolvedValue({
      data: {
        data: [listing({ status: "rejected", title: "Reddedilen İlan" })],
      },
    });
    renderWithProviders(<MyListingsScreen />);
    expect(await screen.findByText("Reddedilen İlan")).toBeOnTheScreen();
    // "Reddedildi" hem chip etiketinde hem ilan rozetinde geçer → en az 2
    await waitFor(() =>
      expect(screen.getAllByText(/listing.filterRejected/).length).toBeGreaterThanOrEqual(
        2,
      ),
    );
  });

  it("J68.3 boş liste → boş durum mesajı", async () => {
    mockGetMyListings.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<MyListingsScreen />);
    expect(await screen.findByText("listing.noListingsYet")).toBeOnTheScreen();
  });
});

describe("J133 · İlan düzenleme navigasyon wiring", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGetMyListings.mockReset();
    mockGetMyStats.mockReset();
    wireStats();
  });

  it('J133.1 eylem menüsü → "Düzenle" → /listing/:id/edit push', async () => {
    mockGetMyListings.mockResolvedValue({
      data: { data: [listing({ id: "L9", status: "active" })] },
    });
    renderWithProviders(<MyListingsScreen />);
    await screen.findByText("Hot Wheels Camaro");

    // İlan menüsünü aç (accessibilityLabel="İlan menüsü")
    fireEvent.press(screen.getByLabelText("listing.menuAccessibility"));
    await screen.findByText("common.edit");
    fireEvent.press(screen.getByText("common.edit"));

    expect(mockPush).toHaveBeenCalledWith("/listing/L9/edit");
  });

  it("J133.2 ilan kartına basınca ürün detayına gider", async () => {
    mockGetMyListings.mockResolvedValue({
      data: { data: [listing({ id: "L9" })] },
    });
    renderWithProviders(<MyListingsScreen />);
    fireEvent.press(await screen.findByText("Hot Wheels Camaro"));
    expect(mockPush).toHaveBeenCalledWith("/product/L9");
  });
});

/**
 * Eylem menüsü bir ui-native Modal. Menü kapanırken AYNI tick'te appAlert (o da
 * bir RN Modal) açmak iOS'ta donmaya yol açıyor (CLAUDE.md §12) — uyarı menü
 * kapandıktan sonra açılmalı.
 */
describe("İlanlarım · menü kapanmadan uyarı açılmaz (iOS donma)", () => {
  beforeEach(() => {
    mockGetMyListings.mockReset();
    mockGetMyStats.mockReset();
    wireStats();
  });

  it('"Pasife al" nedeni penceresi menü kapandıktan sonra açılır (appAlert değil)', async () => {
    const { appAlert } = jest.requireMock("@/ui") as { appAlert: jest.Mock };
    appAlert.mockClear();
    mockGetMyListings.mockResolvedValue({ data: { data: [listing({ id: "L9", status: "active" })] } });
    renderWithProviders(<MyListingsScreen />);
    await screen.findByText("Hot Wheels Camaro");
    fireEvent.press(screen.getByLabelText("listing.menuAccessibility"));
    await screen.findByText("listing.deactivateAction");

    jest.useFakeTimers();
    fireEvent.press(screen.getByText("listing.deactivateAction"));
    expect(screen.queryByText("product.deactivateListingFull")).toBeNull();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.getByText("product.deactivateListingFull")).toBeOnTheScreen();
    expect(appAlert).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});

/**
 * Parite C-1.6 · aktivasyon mesajı API'nin döndürdüğü statüye göre seçilir.
 * İade karantinasındaki ilan doğrudan `active` olur; "incelemeye gönderildi"
 * demek yanlış olurdu.
 */
describe("İlanlarım · aktivasyon mesajı yanıt statüsüne göre", () => {
  async function relistFirstListing(responseStatus: string) {
    const { appAlert } = jest.requireMock("@/ui") as { appAlert: jest.Mock };
    const { productsApi } = jest.requireMock("@/lib/api") as {
      productsApi: { update: jest.Mock };
    };
    appAlert.mockClear();
    productsApi.update.mockReset();
    productsApi.update.mockResolvedValue({ data: { id: "L9", status: responseStatus } });
    mockGetMyListings.mockResolvedValue({
      data: { data: [listing({ id: "L9", status: "inactive" })] },
    });
    renderWithProviders(<MyListingsScreen />);
    await screen.findByText("Hot Wheels Camaro");
    fireEvent.press(screen.getByLabelText("listing.menuAccessibility"));
    fireEvent.press(await screen.findByText("listing.relistAction"));
    await waitFor(() => expect(appAlert).toHaveBeenCalled());
    return appAlert;
  }

  beforeEach(() => {
    mockGetMyListings.mockReset();
    mockGetMyStats.mockReset();
    wireStats();
  });

  it("yanıt statüsü active ise doğrudan yayında mesajı gösterilir", async () => {
    const appAlert = await relistFirstListing("active");
    expect(appAlert).toHaveBeenCalledWith("common.success", "listing.reactivatedImmediately");
  });

  it("yanıt statüsü pending ise incelemeye gönderildi mesajı gösterilir", async () => {
    const appAlert = await relistFirstListing("pending");
    expect(appAlert).toHaveBeenCalledWith("common.success", "listing.sentForReview");
  });
});
