/**
 * Parite C2 inceleme düzeltmeleri · İlanlarım:
 * seçim kutusu/menü çakışması, iOS ModalFreeze, kapanış animasyonu, süresi dolan
 * sayacı, çift refetch, silme onayında ilan adı.
 */
import React from "react";
import { StyleSheet } from "react-native";
import { screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";

jest.mock("expo-router", () => {
  const react = require("react");
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    // Odaklanmada BİR kez çalışır (gerçek hook gibi); render başına değil.
    useFocusEffect: (cb: () => void) => react.useEffect(cb, [cb]),
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, unknown>) => (p?.title ? `${k}:${p.title}` : k) }),
}));

jest.mock("@/stores/authStore", () => {
  const refreshUserData = jest.fn();
  return {
    useAuthStore: (sel?: (state: any) => unknown) => {
      const state: any = {
        user: { listingCount: 2, membershipTier: "free" },
        limits: { maxListings: 10 },
        refreshUserData,
      };
      return sel ? sel(state) : state;
    },
  };
});

/**
 * `appAlert` KAYNAĞINDA da mock'lanır: `alertAfterClose` aynı modülden import eder;
 * yalnız `@/ui` barrel'ı mock'lansaydı ertelenmiş uyarı gerçek diyaloğa giderdi.
 */
jest.mock("@/ui/components/AlertDialog", () => ({
  ...jest.requireActual("@/ui/components/AlertDialog"),
  appAlert: jest.fn(),
}));

/** Gerçek pencere + verilen prop'ların kaydı: kapanış sırasında hangi kipte çizildiğini görmek için. */
const mockRemovalProps: Array<Record<string, any>> = [];
jest.mock("@/components/listing/ListingRemovalModal", () => {
  const actual = jest.requireActual("@/components/listing/ListingRemovalModal");
  return {
    ListingRemovalModal: (props: Record<string, any>) => {
      mockRemovalProps.push(props);
      return actual.ListingRemovalModal(props);
    },
  };
});

jest.mock("@/components/product/BoostModal", () => ({ BoostModal: () => null }));

const mockGetMyListings = jest.fn();
const mockGetMyStats = jest.fn();
jest.mock("@/lib/api", () => ({
  errorText: (e: any, fallback: string) => e?.response?.data?.message ?? fallback,
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
const sourceAlert = () =>
  (jest.requireMock("@/ui/components/AlertDialog") as { appAlert: jest.Mock }).appAlert;

async function openMenu(title: string) {
  await screen.findByText(title);
  fireEvent.press(screen.getByLabelText("listing.menuAccessibility"));
}

/** Menüden pasife al / sil penceresini açar (menü kapanış gecikmesi gerçek zamanda geçer). */
async function openRemoval(menuLabel: string) {
  await openMenu("Hot Wheels Camaro");
  fireEvent.press(await screen.findByText(menuLabel));
}

/** Sunucu gibi: `status` / `inactiveReason` süzer, `meta.total` süzülmüş TOPLAMI verir. */
function serve(all: Array<Record<string, unknown>>) {
  mockGetMyListings.mockImplementation(async (params: Record<string, unknown> = {}) => {
    const rows = all.filter(
      (l) =>
        (!params.status || l.status === params.status) &&
        (!params.inactiveReason || l.inactiveReason === params.inactiveReason),
    );
    const limit = Number(params.limit ?? 20);
    return { data: { data: rows.slice(0, limit), meta: { total: rows.length, page: 1, limit } } };
  });
}

beforeEach(() => {
  mockGetMyListings.mockReset();
  mockGetMyStats.mockReset();
  sourceAlert().mockReset();
  mockRemovalProps.length = 0;
  (["update", "delete", "deactivate", "renew", "renewMany"] as const).forEach((k) => api()[k].mockReset());
  mockGetMyStats.mockResolvedValue({
    data: { counts: { all: 3, active: 1, inactive: 2 }, summary: { used: 1, max: 10, canCreate: true } },
  });
});

describe("C2 inceleme · 1 seçim kutusu ⋮ menüsünü örtmez", () => {
  it("kutu sol üstte (sağ kenara bağlı değil); kutu da ⋮ menüsü de çalışır", async () => {
    serve([expired()]);
    renderWithProviders(<MyListingsScreen />);
    fireEvent.press(await screen.findByText("profile.expiredListings.tab (1)"));
    await screen.findByTestId("select-E1");

    const wrap = StyleSheet.flatten(screen.getByTestId("select-wrap-E1").props.style);
    expect(wrap.left).toBeDefined();
    expect(wrap.right).toBeUndefined();

    // ⋮ menüsü açılır …
    fireEvent.press(screen.getByLabelText("listing.menuAccessibility"));
    expect(await screen.findByText("profile.expiredListings.renew")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("common.view"));

    // … ve kutu da seçim yapar: seçilince "Seçilenleri yenile" yalnız o ilanı yollar.
    api().renewMany.mockResolvedValue({ data: { results: [{ id: "E1", ok: true, status: "active" }], renewed: 1, submitted: 0, failed: 0 } });
    fireEvent.press(screen.getByTestId("select-E1"));
    fireEvent.press(screen.getByText("profile.expiredListings.renewSelected"));
    await waitFor(() => expect(api().renewMany).toHaveBeenCalledWith(["E1"]));
  });
});

describe("C2 inceleme · 2 iOS ModalFreeze: uyarı pencere kapandıktan sonra", () => {
  afterEach(() => jest.useRealTimers());

  async function submitDeactivate(outcome: "ok" | "fail") {
    serve([listing({ id: "A1", status: "active" })]);
    if (outcome === "ok") api().deactivate.mockResolvedValue({ data: {} });
    else api().deactivate.mockRejectedValue({ response: { data: { message: "Sunucu reddetti" } } });
    renderWithProviders(<MyListingsScreen />);
    await openRemoval("listing.deactivateAction");
    await screen.findByText("product.deactivateListingFull");
    fireEvent.press(screen.getByText("status.listingRemoval.reason.paused_temporarily"));
    jest.useFakeTimers();
    fireEvent.press(screen.getByText("product.deactivate"));
    // Yanıt (hata/başarı) anında geldi; pencere kapanışı henüz bitmedi.
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    expect(api().deactivate).toHaveBeenCalled();
  }

  it("hızlı HATA yanıtı: kapanış süresi dolmadan appAlert çıkmaz, sonra çıkar", async () => {
    await submitDeactivate("fail");
    expect(sourceAlert()).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(450);
    });
    expect(sourceAlert()).toHaveBeenCalledWith("common.error", "Sunucu reddetti", undefined);
  });

  it("hızlı BAŞARI yanıtı: kapanış süresi dolmadan appAlert çıkmaz, sonra çıkar", async () => {
    await submitDeactivate("ok");
    expect(sourceAlert()).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(450);
    });
    expect(sourceAlert()).toHaveBeenCalledWith("common.success", "listing.deactivated", undefined);
  });
});

describe("C2 inceleme · 3 kapanış animasyonunda pencere kipi değişmez", () => {
  it("pasife alma penceresi kapanırken 'Sil' kipine dönmez (iptal ve gönderim)", async () => {
    serve([listing({ id: "A1", status: "active" })]);
    api().deactivate.mockResolvedValue({ data: {} });
    renderWithProviders(<MyListingsScreen />);
    await openRemoval("listing.deactivateAction");
    await screen.findByText("product.deactivateListingFull");
    const openIdx = mockRemovalProps.length;
    expect(mockRemovalProps[openIdx - 1]).toMatchObject({ visible: true, action: "deactivate" });

    // İptal: visible düşer, kip aynı kalır.
    fireEvent.press(screen.getByText("common.cancel"));
    await waitFor(() => expect(mockRemovalProps[mockRemovalProps.length - 1].visible).toBe(false));
    expect(mockRemovalProps[mockRemovalProps.length - 1].action).toBe("deactivate");
    expect(mockRemovalProps.slice(openIdx).every((p) => p.action === "deactivate")).toBe(true);
  });

  it("gönderimde de kip korunur", async () => {
    serve([listing({ id: "A1", status: "active" })]);
    api().deactivate.mockResolvedValue({ data: {} });
    renderWithProviders(<MyListingsScreen />);
    await openRemoval("listing.deactivateAction");
    await screen.findByText("product.deactivateListingFull");
    fireEvent.press(screen.getByText("status.listingRemoval.reason.paused_temporarily"));
    const before = mockRemovalProps.length;
    fireEvent.press(screen.getByText("product.deactivate"));
    await waitFor(() => expect(api().deactivate).toHaveBeenCalled());
    const after = mockRemovalProps.slice(before);
    expect(after.length).toBeGreaterThan(0);
    expect(after.some((p) => p.visible === false)).toBe(true);
    expect(after.every((p) => p.action === "deactivate")).toBe(true);
  });
});
