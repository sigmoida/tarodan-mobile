/**
 * J3/J4 · Teklif listesi (Tekliflerim) — mobil UI dilimi.
 * Liste render, boş durum, sekme metinleri, gelen teklif aksiyon butonları görünürlüğü.
 * Backend kabul/red/karşı-teklif aktarımı backend-only.
 */
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  useLocalSearchParams: () => ({}),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Yeni mimaride ekran/hook'lar `@/lib/api`'den import ediyor (services/api artık
// yalnız geriye-dönük barrel). Mock, kodun gerçekten import ettiği modülü hedefler.
jest.mock("@/lib/api", () => ({
  offersApi: { getAll: jest.fn() },
  ordersApi: {
    getCommissionPreviewBatch: jest.fn(() =>
      Promise.resolve({ data: { results: [] } }),
    ),
  },
}));
import { offersApi } from "@/lib/api";

let mockAuth = { isAuthenticated: true, isLoading: false };
jest.mock("@/stores/authStore", () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuth;
    return sel ? sel(state) : state;
  },
}));

import OffersScreen from "../index";

const getAllMock = offersApi.getAll as jest.Mock;

describe("J3 · Tekliflerim listesi", () => {
  beforeEach(() => {
    getAllMock.mockReset();
    mockAuth = { isAuthenticated: true, isLoading: false };
  });

  it('boş durumda "Henüz gelen teklif yok" gösterir', async () => {
    getAllMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<OffersScreen />);
    await waitFor(() =>
      expect(screen.getByText("offer.emptyReceivedTitle")).toBeOnTheScreen(),
    );
    // Sekmeler render olur
    expect(screen.getByText("offer.tabReceived")).toBeOnTheScreen();
    expect(screen.getByText("offer.tabSent")).toBeOnTheScreen();
  });

  it("gelen pending teklifi kart olarak render eder, aksiyon butonları görünür", async () => {
    getAllMock.mockResolvedValue({
      data: {
        data: [
          {
            id: "o1",
            amount: 200,
            status: "pending",
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
            createdAt: new Date().toISOString(),
            product: { id: "p1", title: "Vintage Kamera", price: 400 },
            buyer: { id: "b1", displayName: "Ali Veli" },
          },
        ],
      },
    });
    renderWithProviders(<OffersScreen />);

    await waitFor(() =>
      expect(screen.getByText("Vintage Kamera")).toBeOnTheScreen(),
    );
    expect(screen.getByText("offer.acceptOffer")).toBeOnTheScreen();
    expect(screen.getByText("offer.rejectOffer")).toBeOnTheScreen();
    expect(screen.getByText("offer.counterOffer")).toBeOnTheScreen();
    expect(screen.getByText("Ali Veli")).toBeOnTheScreen();
  });

  it("sekme değişimi yerinde: setParams ile URL güncellenir, yığına yeni ekran (replace) konmaz", async () => {
    const { router } = jest.requireMock("expo-router") as {
      router: { replace: jest.Mock; setParams: jest.Mock };
    };
    router.replace.mockClear();
    router.setParams.mockClear();
    getAllMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<OffersScreen />);
    await waitFor(() =>
      expect(screen.getByText("offer.emptyReceivedTitle")).toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByText("offer.tabSent"));

    expect(router.setParams).toHaveBeenCalledWith({ tab: "sent" });
    expect(router.replace).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText("offer.emptySentTitle")).toBeOnTheScreen(),
    );
  });

  it("kart: teklif tutarı + çizili ilan fiyatı + indirim yüzdesi; < 6 sa kalan süre uyarı tonunda", async () => {
    getAllMock.mockResolvedValue({
      data: {
        data: [
          {
            id: "o1",
            amount: 300,
            status: "pending",
            expiresAt: new Date(Date.now() + 2 * 3600_000).toISOString(),
            createdAt: new Date().toISOString(),
            product: { id: "p1", title: "Vintage Kamera", price: 400 },
            buyer: { id: "b1", displayName: "Ali Veli" },
            message: "Son fiyat bu mu?",
          },
          {
            id: "o2",
            amount: 400,
            status: "pending",
            expiresAt: new Date(Date.now() + 20 * 3600_000).toISOString(),
            createdAt: new Date().toISOString(),
            product: { id: "p2", title: "Eski Saat", price: 400 },
            buyer: { id: "b2", displayName: "Ayşe" },
          },
        ],
      },
    });
    renderWithProviders(<OffersScreen />);

    await waitFor(() => expect(screen.getByTestId("offer-card-o1")).toBeOnTheScreen());
    // İndirim rozeti yalnız ilan fiyatının altındaki teklifte (o2 = ilan fiyatı).
    expect(screen.getAllByTestId("offer-discount-percent")).toHaveLength(1);
    // Kalan süre: o1 (2 sa) uyarı, o2 (20 sa) nötr.
    expect(screen.getAllByTestId("offer-time-remaining-soon")).toHaveLength(1);
    expect(screen.getAllByTestId("offer-time-remaining")).toHaveLength(1);
    expect(screen.getByTestId("offer-message")).toHaveTextContent("Son fiyat bu mu?");
    // Karşı taraf etiketi: gelen sekmede "Alıcı".
    expect(screen.getAllByText("order.buyer")).toHaveLength(2);
  });

  it("giriş yapılmamışsa auth gate gösterir", async () => {
    mockAuth = { isAuthenticated: false, isLoading: false };
    renderWithProviders(<OffersScreen />);
    expect(
      screen.getByText("offer.authGateSubtitle"),
    ).toBeOnTheScreen();
    expect(screen.getByText("common.login")).toBeOnTheScreen();
  });
});
