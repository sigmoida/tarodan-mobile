/**
 * J14 · Üyelik paket listesi ekranı (membership/index).
 * Yalnız MOBİL-UI: paket kartlarının render'ı, mevcut plan rozeti, aylık/yıllık
 * toggle, yükselt butonu → checkout navigasyon wiring.
 * Backend abonelik/tahsilat backendOnly.
 */
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { resetRouterMocks, pushMock } from "@/test-utils/router-mock";

jest.mock("expo-router", () => require("@/test-utils/router-mock").routerMock);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

let mockAuthState: any = { isAuthenticated: true, user: {} };
jest.mock("@/stores/authStore", () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuthState;
    return sel ? sel(state) : state;
  },
}));

jest.mock("@/lib/api", () => ({
  api: { get: jest.fn() },
  membershipApi: { getCurrentMembership: jest.fn(), getTiers: jest.fn() },
}));
import { membershipApi } from "@/lib/api";
const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;
const mockGetTiers = membershipApi.getTiers as jest.Mock;

import MembershipScreen from "../index";

describe("J14 · üyelik paket listesi (membership/index)", () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    mockGetMembership.mockResolvedValue({
      data: { tier: { type: "free", name: "Ücretsiz" } },
    });
    mockGetTiers.mockResolvedValue({ data: [] });
  });

  it("J14.1 yüklendikten sonra paket kartları render edilir (Temel/Premium)", async () => {
    renderWithProviders(<MembershipScreen />);
    await waitFor(() => expect(screen.getByText("membership.basic")).toBeOnTheScreen());
    expect(screen.getByText("membership.premium")).toBeOnTheScreen();
    // Free kullanıcı için mevcut plan özeti
    expect(screen.getByText("membership.currentPlan")).toBeOnTheScreen();
  });

  it("J14.2 aylık/yıllık toggle render edilir", async () => {
    renderWithProviders(<MembershipScreen />);
    await waitFor(() => expect(screen.getByText("membership.monthly")).toBeOnTheScreen());
    expect(screen.getByText("membership.yearly")).toBeOnTheScreen();
  });

  it('J14.3 "Yükselt" → checkout ekranına tier+period ile yönlendirir', async () => {
    renderWithProviders(<MembershipScreen />);
    await waitFor(() =>
      expect(screen.getAllByText("membership.upgrade").length).toBeGreaterThan(0),
    );
    fireEvent.press(screen.getAllByText("membership.upgrade")[0]);
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("/membership/checkout?tier="),
    );
  });

  it("J14.4 her iki istek de reddedilirse hata banner gösterilir", async () => {
    mockGetMembership.mockRejectedValue(new Error("net"));
    mockGetTiers.mockRejectedValue(new Error("net"));
    renderWithProviders(<MembershipScreen />);
    await waitFor(() =>
      expect(screen.getByText("membership.loadError")).toBeOnTheScreen(),
    );
  });
});
