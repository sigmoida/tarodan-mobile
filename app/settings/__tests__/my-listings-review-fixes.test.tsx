/**
 * Parite C2 inceleme düzeltmeleri · İlanlarım:
 * seçim kutusu/menü çakışması, iOS ModalFreeze, kapanış animasyonu, süresi dolan
 * sayacı, çift refetch, silme onayında ilan adı.
 */
import React from "react";
import { StyleSheet } from "react-native";
import { screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { qk } from "@/lib/query";

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

describe("C2 inceleme · 4 paylaşılan invalidation kümesi", () => {
  it("pasife alma ürün detayını, genel listeleri ve ana sayfa akışlarını da tazeler", async () => {
    serve([listing({ id: "A1", status: "active" })]);
    api().deactivate.mockResolvedValue({ data: {} });
    const { queryClient } = renderWithProviders(<MyListingsScreen />);
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    await openRemoval("listing.deactivateAction");
    await screen.findByText("product.deactivateListingFull");
    fireEvent.press(screen.getByText("status.listingRemoval.reason.paused_temporarily"));
    fireEvent.press(screen.getByText("product.deactivate"));
    await waitFor(() => expect(api().deactivate).toHaveBeenCalled());

    await waitFor(() => {
      const keys = spy.mock.calls.map(([f]) => (f as { queryKey: unknown }).queryKey);
      expect(keys).toEqual(
        expect.arrayContaining([
          qk.products.myListingsAll,
          qk.products.detail("A1"),
          qk.products.all,
          qk.products.searchAll,
          qk.products.featuredCollector,
        ]),
      );
    });
  });
});

describe("C2 inceleme · 5 süresi dolan sayacı meta.total'dan", () => {
  it("100'den fazla süresi dolan ilan: chip/banner gerçek toplamı gösterir, liste çekilmez (limit=1)", async () => {
    serve(Array.from({ length: 150 }, (_, i) => expired({ id: `E${i}`, title: `Dolan ${i}` })));
    renderWithProviders(<MyListingsScreen />);
    expect(await screen.findByText("profile.expiredListings.tab (150)")).toBeOnTheScreen();
    expect(screen.getByText("profile.expiredListings.bannerTitle")).toBeOnTheScreen();

    // "Tümü" sekmesindeyken süresi dolanlar için YALNIZ limit=1 sayaç isteği atılır.
    const expiredCalls = mockGetMyListings.mock.calls
      .map(([p]) => p)
      .filter((p) => p?.inactiveReason === "expired");
    expect(expiredCalls.length).toBeGreaterThan(0);
    expect(expiredCalls.every((p) => p.limit === 1)).toBe(true);
  });

  it("meta yoksa gelen satır sayısına düşer", async () => {
    mockGetMyListings.mockImplementation(async (params: Record<string, unknown> = {}) => ({
      data: { data: params.inactiveReason === "expired" ? [expired(), expired({ id: "E2" })] : [] },
    }));
    renderWithProviders(<MyListingsScreen />);
    expect(await screen.findByText("profile.expiredListings.tab (2)")).toBeOnTheScreen();
  });
});

describe("C2 inceleme · 6 odaklanma/yenileme aynı anahtarı iki kez çekmez", () => {
  const listCalls = (reason?: "expired") =>
    mockGetMyListings.mock.calls
      .map(([p]) => p)
      .filter((p) => (reason ? p?.inactiveReason === reason && p.limit === 100 : p?.limit === 100));

  it("ilk açılış: liste ve sayaç sorgusu birer kez gider (odaklanma uçuştakini iptal etmez)", async () => {
    serve([expired()]);
    renderWithProviders(<MyListingsScreen />);
    await screen.findByText("profile.expiredListings.tab (1)");
    await screen.findByText("Süresi Dolan");
    expect(listCalls()).toHaveLength(1);
    expect(mockGetMyListings.mock.calls.filter(([p]) => p?.limit === 1)).toHaveLength(1);
  });

  it("'Süresi dolan' sekmesinde çek-yenile: liste tek, sayaç tek istek", async () => {
    serve([expired()]);
    renderWithProviders(<MyListingsScreen />);
    fireEvent.press(await screen.findByText("profile.expiredListings.tab (1)"));
    await screen.findByText("profile.expiredListings.selectAll");
    await waitFor(() => expect(listCalls("expired")).toHaveLength(1));
    mockGetMyListings.mockClear();

    const scroll = screen.UNSAFE_getAllByType(require("react-native").ScrollView).find((n) => n.props.refreshControl);
    await act(async () => {
      await scroll!.props.refreshControl.props.onRefresh();
    });
    expect(listCalls("expired")).toHaveLength(1);
    expect(mockGetMyListings.mock.calls.filter(([p]) => p?.limit === 1)).toHaveLength(1);
  });
});

describe("C2 inceleme · 8 tanınmayan toplu yenileme yanıtı hata sayılır", () => {
  it.each([
    ["gövdesiz", {}],
    ["sayaçlı ama results yok", { renewed: 2, submitted: 0, failed: 0 }],
  ])("%s yanıt: 'Başarılı' DEĞİL, hata uyarısı; liste tazelenir", async (_n, body) => {
    serve([expired({ id: "E1", title: "Bir" })]);
    api().renewMany.mockResolvedValue({ data: body });
    const { queryClient } = renderWithProviders(<MyListingsScreen />);
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    fireEvent.press(await screen.findByText("profile.expiredListings.tab (1)"));
    fireEvent.press(await screen.findByText("profile.expiredListings.selectAll"));
    fireEvent.press(await screen.findByText("profile.expiredListings.renewSelected"));

    await waitFor(() => expect(alertMock()).toHaveBeenCalled());
    expect(alertMock()).toHaveBeenCalledTimes(1);
    expect(alertMock()).toHaveBeenCalledWith("common.error", "profile.expiredListings.renewFailed");
    expect(spy.mock.calls.map(([f]) => (f as { queryKey: unknown }).queryKey)).toContainEqual(
      qk.products.myListingsAll,
    );
  });
});

describe("C2 inceleme · 9 kaldırma penceresi hangi ilan olduğunu söyler", () => {
  it("kalıcı silme: onay cümlesi ilan adını içerir", async () => {
    serve([listing({ id: "A1", status: "active", title: "Hot Wheels Camaro" })]);
    renderWithProviders(<MyListingsScreen />);
    await openRemoval("common.delete");
    expect(await screen.findByText("listing.deleteConfirmNamed:Hot Wheels Camaro")).toBeOnTheScreen();
  });

  it("pasife alma: başlık satırı ilanın adını gösterir", async () => {
    serve([listing({ id: "A1", status: "active", title: "Hot Wheels Camaro" })]);
    renderWithProviders(<MyListingsScreen />);
    await openRemoval("listing.deactivateAction");
    await screen.findByText("product.deactivateListingFull");
    // Aynı ad listede de var: pencere açıkken ikinci bir kopya (pencere içi satır) olmalı.
    expect(screen.getAllByText("Hot Wheels Camaro").length).toBeGreaterThanOrEqual(2);
    expect(mockRemovalProps[mockRemovalProps.length - 1].listingTitle).toBe("Hot Wheels Camaro");
  });
});
