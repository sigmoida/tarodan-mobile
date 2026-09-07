/**
 * iOS'ta abonelik ayarları ekranında "yeniden etkinleştir" satırı gizli:
 * otomatik yenilemeyi yeniden AÇMAK PayTR'de yinelenen tahsilatı yeniden
 * başlatmak — yani uygulama içi satın alma. İPTAL satırı satın alma
 * OLMADIĞI için aktif abonelikte kalmaya devam eder.
 *
 * TEKNİK: bkz. app/settings/__tests__/subscription.test.tsx başlığındaki not
 * — CAN_BUY_DIGITAL'ı modül seviyesinde mock'luyoruz.
 */
import React from "react";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { resetRouterMocks } from "@/test-utils/router-mock";

jest.mock("@/lib/purchases", () => ({
  ...jest.requireActual("@/lib/purchases"),
  CAN_BUY_DIGITAL: false,
}));

jest.mock("expo-router", () => {
  const rm = require("@/test-utils/router-mock").routerMock;
  return { ...rm, useFocusEffect: (cb: any) => cb() };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

let mockAuthState = { isAuthenticated: true };
jest.mock("@/stores/authStore", () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuthState;
    return sel ? sel(state) : state;
  },
}));

jest.mock("@/lib/api", () => ({
  membershipApi: {
    getCurrentMembership: jest.fn(),
    cancel: jest.fn().mockResolvedValue({ data: {} }),
    setAutoRenew: jest.fn().mockResolvedValue({ data: {} }),
  },
  paymentsApi: {
    getMyPayments: jest.fn().mockResolvedValue({ data: [] }),
  },
}));

import { membershipApi } from "@/lib/api";
import SubscriptionSettingsScreen from "../index";

const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;

const activePremiumSub = {
  id: "s1",
  userId: "u1",
  tierId: "premium",
  tier: { type: "premium" },
  status: "active",
  billingPeriod: "monthly",
  currentPeriodStart: new Date(Date.now() - 86400000).toISOString(),
  currentPeriodEnd: new Date(Date.now() + 10 * 86400000).toISOString(),
  cancelledAt: null,
  createdAt: new Date().toISOString(),
};

// Dönem içi iptal: ödenen dönem bitene kadar hâlâ premium sayılır
// (isSubscriptionActive), bu yüzden currentPeriodEnd GELECEKTE kalmalı.
const cancelledPremiumSub = {
  ...activePremiumSub,
  status: "cancelled",
  cancelledAt: new Date().toISOString(),
};

describe("iOS · abonelik yeniden etkinleştirme satın alma olduğu için gizli", () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true };
    mockGetMembership.mockReset();
  });

  it("iptal edilmiş abonelik: yeniden etkinleştir satırı yok", async () => {
    mockGetMembership.mockResolvedValue({ data: cancelledPremiumSub });
    renderWithProviders(<SubscriptionSettingsScreen />);
    expect(await screen.findByText("membership.expiringWarningTitle")).toBeOnTheScreen();
    expect(screen.queryByText("membership.reactivateSubscriptionTitle")).toBeNull();
  });

  it("aktif premium abonelik: iptal satırı kalır (satın alma değil)", async () => {
    mockGetMembership.mockResolvedValue({ data: activePremiumSub });
    renderWithProviders(<SubscriptionSettingsScreen />);
    expect(await screen.findByText("membership.cancelTitle")).toBeOnTheScreen();
  });
});
