/**
 * Adres LİSTESİ ekranı (settings/addresses). Form (J32 / J388 validasyonu) artık
 * ayrı ekranlarda — bkz. `app/settings/addresses/__tests__/address-form.test.tsx`.
 * Burada: liste → yeni / düzenle ekranına yönlendirme, satır-bazlı "Varsayılan
 * Yap", hata geri bildirimi ve sorgu hatasının yutulmaması.
 */
import React from "react";
import { appAlert, toast } from "@/ui";
import { screen, fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { pushMock, resetRouterMocks } from "@/test-utils/router-mock";

jest.mock("expo-router", () => ({
  ...require("@/test-utils/router-mock").routerMock,
  useFocusEffect: jest.fn(),
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: true, limits: { maxAddresses: 10 } });
    return sel ? sel(state) : state;
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock("@/lib/api", () => ({
  api: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  addressesApi: { setDefault: jest.fn() },
}));
import { api, addressesApi } from "@/lib/api";

import AddressesScreen from "../addresses";

const ADDRESS = {
  id: "a1",
  title: "Ev",
  fullName: "Ayşe",
  address: "Sokak 1",
  city: "İstanbul",
  district: "Kadıköy",
  phone: "5551112233",
  isDefault: false,
};

// Yüklü makinede (paralel ajanlar) ilk render + sorgu 1 sn'yi aşabiliyor.
const SLOW = { timeout: 5000 };

describe("Adres listesi → form EKRANLARINA yönlendirme (modal yok)", () => {
  beforeEach(() => {
    resetRouterMocks();
    (api.get as jest.Mock).mockReset();
  });

  it("boş listede \"Yeni Adres Ekle\" → /settings/addresses/new ekranı itilir", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    renderWithProviders(<AddressesScreen />);
    fireEvent.press(await screen.findByText("address.addNewAddress", {}, SLOW));
    expect(pushMock).toHaveBeenCalledWith("/settings/addresses/new");
    // Form artık bu ekranda çizilmez.
    expect(screen.queryByTestId("address-save-button")).toBeNull();
  });

  it("dolu listede üst bardaki \"+\" aynı ekranı iter; içerikte \"Yeni Adres\" düğmesi yok", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [ADDRESS] });
    renderWithProviders(<AddressesScreen />);
    fireEvent.press(await screen.findByTestId("address-add-button", {}, SLOW));
    expect(pushMock).toHaveBeenCalledWith("/settings/addresses/new");
    expect(screen.queryByText("address.newAddress")).toBeNull();
    expect(screen.getByTestId("address-add-button").props.accessibilityLabel).toBe("address.newAddress");
  });

  it("limit göstergesi soluk metin olarak listenin üstünde", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [ADDRESS] });
    renderWithProviders(<AddressesScreen />);
    expect(await screen.findByTestId("address-limit-usage", {}, SLOW)).toHaveTextContent("address.limitUsage");
  });

  it("boş listede üst bar \"+\" yok (EmptyState eylemi yeterli)", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    renderWithProviders(<AddressesScreen />);
    await screen.findByText("address.addNewAddress", {}, SLOW);
    expect(screen.queryByTestId("address-add-button")).toBeNull();
  });

  it("limit dolunca üst bar \"+\" gizlenir", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: Array.from({ length: 10 }, (_, i) => ({ ...ADDRESS, id: `a${i}`, title: `Adres ${i}` })),
    });
    renderWithProviders(<AddressesScreen />);
    await screen.findByText("Adres 0", {}, SLOW);
    expect(screen.queryByTestId("address-add-button")).toBeNull();
  });

  it("satırdaki düzenle → /settings/addresses/<id>/edit", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [ADDRESS] });
    renderWithProviders(<AddressesScreen />);
    await screen.findByText("Ev", {}, SLOW);
    fireEvent.press(screen.getByLabelText("address.editAddress"));
    expect(pushMock).toHaveBeenCalledWith("/settings/addresses/a1/edit");
  });

  it("silme mevcut appAlert onayıyla; onayda DELETE + başarı toast", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [ADDRESS] });
    (api.delete as jest.Mock).mockResolvedValue({});
    const success = jest.spyOn(toast, "success").mockImplementation(() => 1);
    renderWithProviders(<AddressesScreen />);
    await screen.findByText("Ev", {}, SLOW);
    fireEvent.press(screen.getByLabelText("address.deleteAddress"));
    expect(appAlert).toHaveBeenCalledTimes(1);
    const [, , buttons] = (appAlert as jest.Mock).mock.calls[0];
    buttons.find((b: any) => b.style === "destructive").onPress();
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/users/me/addresses/a1"));
    await waitFor(() => expect(success).toHaveBeenCalledWith("address.deleted"));
    success.mockRestore();
  });
});

/**
 * Bulgu #23 regresyonu · "Varsayılan Yap" yükleme durumu yalnız basılan satırda.
 * setDefaultMutation tek hook → isPending paylaşımlı; fix `variables === address.id`
 * ile satıra daraltıyor. Button isLoading=true iken başlığı yerine spinner basar,
 * dolayısıyla pending satırın "Varsayılan Yap" metni kaybolur, diğeri kalır.
 */
describe('J32.b · "Varsayılan Yap" satır-bazlı yükleme (bulgu #23)', () => {
  const get = api.get as jest.Mock;
  const patch = api.patch as jest.Mock;
  const setDefault = addressesApi.setDefault as jest.Mock;
  let resolvePatch: (value: unknown) => void;

  beforeEach(() => {
    get.mockReset();
    patch.mockReset();
    setDefault.mockReset();
    (appAlert as jest.Mock).mockImplementation(() => {});
    get.mockResolvedValue({
      data: [
        {
          id: "a1",
          title: "Ev",
          fullName: "Ayşe",
          address: "Sokak 1",
          city: "İstanbul",
          district: "Kadıköy",
          phone: "5551112233",
          isDefault: false,
        },
        {
          id: "a2",
          title: "İş",
          fullName: "Ayşe",
          address: "Cadde 2",
          city: "Ankara",
          district: "Çankaya",
          phone: "5554445566",
          isDefault: false,
        },
      ],
    });
    // Kontrollü deferred → mutation'ı pending tutar; test sonunda çözüp temizleriz
    // (çözülmeyen promise bırakmak tüm suite'i kapanışta asılı bırakırdı).
    setDefault.mockReturnValue(
      new Promise((resolve) => {
        resolvePatch = resolve;
      }),
    );
  });

  it("bir satırda işlem beklerken yalnız o satır spinner gösterir, diğeri kalır", async () => {
    renderWithProviders(<AddressesScreen />);

    const buttons = await screen.findAllByText("address.makeDefault");
    expect(buttons).toHaveLength(2);

    fireEvent.press(buttons[0]!);

    // a1 pending → web Button gibi etiket kalır, düğme kilitli/meşgul (spinner etiketin önünde);
    // a2 dokunulmadığı için açık kalır.
    await waitFor(() => {
      const [first, second] = screen.getAllByText("address.makeDefault");
      expect(first).toBeDisabled();
      expect(second).not.toBeDisabled();
    });
    // B-1.3: var olmayan `/default` ucu değil, web ile aynı `addressesApi.setDefault`
    // (PATCH /users/me/addresses/:id { isDefault: true }) — payload'ı api testi doğrular.
    expect(setDefault).toHaveBeenCalledTimes(1);
    expect(setDefault).toHaveBeenCalledWith("a1");
    expect(patch).not.toHaveBeenCalled();

    // Mutation'ı çöz → onSuccess invalidate eder, a1 satırı yükleme durumundan çıkar,
    // dangling handle kalmaz. Her iki buton tekrar görünür.
    resolvePatch({ data: { id: "a1" } });
    // Buradaki bekleyiş DÖRT adımlı bir zincir: promise çözülür → onSuccess →
    // invalidateQueries → yeniden fetch → render. RNTL'in 1 sn'lik varsayılanı
    // yüklü bir CI runner'ında bu zincire dar geliyor (yerelde geçip CI'da iki
    // kez düşmüştü). Süreyi açmak iddiayı zayıflatmıyor: davranış yanlışsa test
    // yine kırılır, yalnız yavaş makineye tolerans tanınıyor.
    await waitFor(
      () => {
        expect(screen.getAllByText("address.makeDefault")).toHaveLength(2);
      },
      { timeout: 5000 },
    );
    // Test süresi iç `waitFor`'un 5 sn'sinden UZUN olmalı: jest'in varsayılan
    // 5 sn'lik test sınırı, yüklü makinede iç bekleyiş bitmeden testi düşürüyordu
    // (tam suite'te görüldü; tek başına koşumda geçiyor).
  }, 15000);
});

/**
 * B-1.3 · "Varsayılan Yap" hatası artık yutulmuyor — sunucu mesajı (yoksa
 * `address.defaultFailed`) kullanıcıya gösterilir. Karar ağacı: yeniden
 * denenebilir işlem hatası → `toast.error` (useAppMutation), appAlert DEĞİL.
 */
describe('B-1.3 · "Varsayılan Yap" hatası görünür', () => {
  const get = api.get as jest.Mock;
  const setDefault = addressesApi.setDefault as jest.Mock;

  beforeEach(() => {
    get.mockReset();
    setDefault.mockReset();
    (appAlert as jest.Mock).mockReset();
    (appAlert as jest.Mock).mockImplementation(() => {});
    get.mockResolvedValue({
      data: [
        {
          id: "a1",
          title: "Ev",
          fullName: "Ayşe",
          address: "Sokak 1",
          city: "İstanbul",
          district: "Kadıköy",
          phone: "5551112233",
          isDefault: false,
        },
      ],
    });
  });

  let errorToast: jest.SpyInstance;
  beforeEach(() => {
    errorToast = jest.spyOn(toast, "error").mockImplementation(() => 1);
  });
  afterEach(() => errorToast.mockRestore());

  it("sunucu mesajsız hata → address.defaultFailed toast'ı (statusCode yoksa düz yedek metin)", async () => {
    setDefault.mockRejectedValue({ response: { status: 500, data: {} } });
    renderWithProviders(<AddressesScreen />);
    fireEvent.press(await screen.findByText("address.makeDefault"));
    await waitFor(() => {
      expect(errorToast).toHaveBeenCalledWith("address.defaultFailed");
    });
    expect(appAlert).not.toHaveBeenCalled();
  });

  it("sunucu mesajı varsa o gösterilir", async () => {
    setDefault.mockRejectedValue({
      response: { status: 404, data: { message: "Adres bulunamadı" } },
    });
    renderWithProviders(<AddressesScreen />);
    fireEvent.press(await screen.findByText("address.makeDefault"));
    await waitFor(() => {
      expect(errorToast).toHaveBeenCalledWith("Adres bulunamadı");
    });
  });
});

describe("C3 inceleme · adres sorgusu hatayı yutmaz", () => {
  it("API hata verince önbelleğe [] yazılmaz (ilan formu kapısıyla ortak anahtar)", async () => {
    const { QueryClient } = require("@tanstack/react-query");
    const { qk } = require("@/lib/query");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    (api.get as jest.Mock).mockRejectedValueOnce(new Error("network"));
    renderWithProviders(<AddressesScreen />, { queryClient: qc });
    await waitFor(() => expect(qc.getQueryState(qk.user.addresses)?.status).toBe("error"));
    expect(qc.getQueryData(qk.user.addresses)).toBeUndefined();
  });
});
