/**
 * Parite C-3.2 · ilan yaşam döngüsü (İlanlarım): /renew uçları, toplu yenileme,
 * süresi dolanlar görünümü, inactiveReason ipucu, ölü "≤7 gün" uyarısının
 * kalkması ve kaldırma nedeni penceresi.
 */
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: (cb: any) => cb(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      user: { listingCount: 2, membershipTier: "free" },
      limits: { maxListings: 10 },
      refreshUserData: jest.fn(),
    };
    return sel ? sel(state) : state;
  },
}));

jest.mock("@/components/product/BoostModal", () => ({ BoostModal: () => null }));

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

const expired = (overrides = {}) =>
  listing({ id: "E1", title: "Süresi Dolan", status: "inactive", inactiveReason: "expired", ...overrides });

const api = () =>
  (jest.requireMock("@/lib/api") as {
    productsApi: Record<"update" | "delete" | "deactivate" | "renew" | "renewMany", jest.Mock>;
  }).productsApi;
const alertMock = () => (jest.requireMock("@/ui") as { appAlert: jest.Mock }).appAlert;
// Başarı bilgisi toast (diyalog değil): `toast.success` izlenir.
let toastSuccess: jest.SpyInstance;
beforeEach(() => {
  toastSuccess = jest
    .spyOn((jest.requireMock("@/ui") as { toast: { success: () => number } }).toast, "success")
    .mockImplementation(() => 1);
});
afterEach(() => toastSuccess.mockRestore());

/** Sunucu gibi: `status` / `inactiveReason` parametreleri listeyi süzer. */
function serve(all: Array<Record<string, unknown>>) {
  mockGetMyListings.mockImplementation(async (params: Record<string, unknown> = {}) => ({
    data: {
      data: all.filter(
        (l) =>
          (!params.status || l.status === params.status) &&
          (!params.inactiveReason || l.inactiveReason === params.inactiveReason),
      ),
    },
  }));
}

async function openMenu(title: string) {
  await screen.findByText(title);
  fireEvent.press(screen.getByLabelText("listing.menuAccessibility"));
}

describe("İlanlarım · C-3.2 ilan yaşam döngüsü", () => {
  beforeEach(() => {
    mockGetMyListings.mockReset();
    mockGetMyStats.mockReset();
    (["update", "delete", "deactivate", "renew", "renewMany"] as const).forEach((k) => api()[k].mockReset());
    mockGetMyStats.mockResolvedValue({
      data: { counts: { all: 3, active: 1, inactive: 2 }, summary: { used: 1, max: 10, canCreate: true } },
    });
  });

  it("süresi dolan ilan 'Yenile' → POST /renew (relist PATCH'i DEĞİL); active → 'yayında' mesajı", async () => {
    serve([expired()]);
    api().renew.mockResolvedValue({ data: { id: "E1", status: "active" } });
    renderWithProviders(<MyListingsScreen />);
    await openMenu("Süresi Dolan");
    fireEvent.press(await screen.findByText("profile.expiredListings.renew"));

    await waitFor(() => expect(api().renew).toHaveBeenCalledWith("E1"));
    expect(api().update).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("profile.expiredListings.renewed"),
    );
  });

  it("renew yanıtı pending (zarflı gövde) → 'onaya gönderildi' mesajı", async () => {
    serve([expired()]);
    api().renew.mockResolvedValue({ data: { data: { id: "E1", status: "pending" } } });
    renderWithProviders(<MyListingsScreen />);
    await openMenu("Süresi Dolan");
    fireEvent.press(await screen.findByText("profile.expiredListings.renew"));
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("profile.expiredListings.submitted"),
    );
  });

  it("süresi dolmamış pasif ilan 'Yeniden yayınla' → PATCH {status:'active'} (relist bayrağı yok)", async () => {
    serve([listing({ id: "I1", title: "Pasif", status: "inactive", inactiveReason: "return_quarantine" })]);
    api().update.mockResolvedValue({ data: { id: "I1", status: "active" } });
    renderWithProviders(<MyListingsScreen />);
    await openMenu("Pasif");
    fireEvent.press(await screen.findByText("listing.relistAction"));
    await waitFor(() => expect(api().update).toHaveBeenCalledWith("I1", { status: "active" }));
    expect(api().renew).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("listing.reactivatedImmediately"),
    );
  });

  it("kart ipucu: süresi dolan → yenileme çağrısı; iade karantinası → bekleme açıklaması", async () => {
    serve([
      expired(),
      listing({ id: "Q1", title: "Karantina", status: "inactive", inactiveReason: "return_quarantine" }),
    ]);
    renderWithProviders(<MyListingsScreen />);
    await screen.findByText("Karantina");
    expect(screen.getByText("profile.expiredListings.cardHint")).toBeOnTheScreen();
    expect(screen.getByText("status.listingRemoval.reason.return_quarantine")).toBeOnTheScreen();
  });

  it("süresi dolan ilan rozeti 'Süresi doldu' (genel 'Pasif' değil)", async () => {
    serve([expired()]);
    renderWithProviders(<MyListingsScreen />);
    await screen.findByText("Süresi Dolan");
    expect(screen.getByText("profile.listingStatus.expired")).toBeOnTheScreen();
  });

  it("ölü '≤7 gün' uyarısı yok: expiresAt gelse bile gösterilmez", async () => {
    const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
    serve([listing({ id: "A1", status: "active", expiresAt: soon })]);
    renderWithProviders(<MyListingsScreen />);
    await screen.findByText("Hot Wheels Camaro");
    expect(screen.queryByText("listing.expiresInDays")).toBeNull();
  });

  it("diğer sekmelerde banner → 'Süresi dolan' sekmesine geçer; seçim çubuğu görünür", async () => {
    serve([expired(), listing({ id: "A1", title: "Aktif", status: "active" })]);
    renderWithProviders(<MyListingsScreen />);
    expect(await screen.findByText("profile.expiredListings.bannerTitle")).toBeOnTheScreen();
    expect(screen.getByText("profile.expiredListings.tab (1)")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("profile.expiredListings.tab"));
    expect(await screen.findByText("profile.expiredListings.selectAll")).toBeOnTheScreen();
    expect(screen.queryByText("profile.expiredListings.bannerTitle")).toBeNull();
  });

  it("toplu yenileme: seçilenler tek POST /my/renew ile gider; başarısız ilan özetlenir (kısmi başarı hata değil)", async () => {
    serve([expired({ id: "E1", title: "Bir" }), expired({ id: "E2", title: "İki" })]);
    api().renewMany.mockResolvedValue({
      data: {
        results: [
          { id: "E1", ok: true, status: "active" },
          { id: "E2", ok: false, errorKey: "server.product.listingLimitReached", errorParams: { maxListings: 5 } },
        ],
        renewed: 1,
        submitted: 0,
        failed: 1,
      },
    });
    renderWithProviders(<MyListingsScreen />);
    fireEvent.press(await screen.findByText("profile.expiredListings.tab (2)"));
    fireEvent.press(await screen.findByText("profile.expiredListings.selectAll"));
    fireEvent.press(await screen.findByText("profile.expiredListings.renewSelected"));

    await waitFor(() => expect(api().renewMany).toHaveBeenCalledWith(["E1", "E2"]));
    await waitFor(() => expect(alertMock()).toHaveBeenCalled());
    const [title, message] = alertMock().mock.calls[0];
    expect(title).toBe("common.success");
    expect(message).toContain("profile.expiredListings.bulkRenewed");
    expect(message).toContain("profile.expiredListings.bulkFailed");
    expect(message).toContain("profile.expiredListings.failedItem");
  });

  it("pasife alma: neden seçilmeden gönderilmez; seçilince nedenle birlikte gider", async () => {
    serve([listing({ id: "A1", status: "active" })]);
    api().deactivate.mockResolvedValue({ data: {} });
    renderWithProviders(<MyListingsScreen />);
    await openMenu("Hot Wheels Camaro");
    fireEvent.press(await screen.findByText("listing.deactivateAction"));
    await screen.findByText("product.deactivateListingFull");

    fireEvent.press(screen.getByText("product.deactivate"));
    expect(await screen.findByText("validation.listingRemoval.reason_required")).toBeOnTheScreen();
    expect(api().deactivate).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("status.listingRemoval.reason.paused_temporarily"));
    fireEvent.press(screen.getByText("product.deactivate"));
    await waitFor(() =>
      expect(api().deactivate).toHaveBeenCalledWith("A1", { removalReason: "paused_temporarily" }),
    );
  });

  it("silme: 'başka platformda sattım' platform ister; gönderimde neden+platform DELETE'e gider", async () => {
    serve([listing({ id: "A1", status: "active" })]);
    api().delete.mockResolvedValue({ data: {} });
    renderWithProviders(<MyListingsScreen />);
    await openMenu("Hot Wheels Camaro");
    fireEvent.press(await screen.findByText("common.delete"));
    await screen.findByText("product.removal.deleteDescription");
    // silmede geçici duraklatma seçeneği yok
    expect(screen.queryByText("status.listingRemoval.reason.paused_temporarily")).toBeNull();

    fireEvent.press(screen.getByText("status.listingRemoval.reason.sold_elsewhere"));
    fireEvent.press(screen.getByText("collection.yesDelete"));
    expect(await screen.findByText("validation.listingRemoval.platform_required")).toBeOnTheScreen();
    expect(api().delete).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("status.listingRemoval.platform.dolap"));
    fireEvent.press(screen.getByText("collection.yesDelete"));
    await waitFor(() =>
      expect(api().delete).toHaveBeenCalledWith("A1", {
        removalReason: "sold_elsewhere",
        removalPlatform: "dolap",
      }),
    );
  });
});
