/**
 * Parite C-3.2 · toplu yenileme sonuçları HTTP 201 gövdesinde `errorKey` ile gelir:
 * axios interceptor'ından geçmediği için istemci çevirir ve dijital satış kapalıyken
 * üyelik satışı ima eden metni elle nötrler (`iosNeutralErrors` eşlemesi).
 */
import { readRenewBatch, renewErrorText, renewSummary, type RenewTexts } from "../renewal";
import { activationMessageKey, renewMessageKey, responseStatus } from "../activation";

const CATALOG: Record<string, string> = {
  "server.product.renewNotExpired": "Yalnızca süresi dolmuş ilanlar yenilenebilir.",
  "server.product.renewFailed": "İlan yenilenemedi. Lütfen tekrar deneyin.",
  "server.product.corporateSalesSuspended": "Kurumsal üyeliğinizi yenileyin ve satışa açın.",
  "server.product.listingLimitReached": "Limit doldu. Üyeliğinizi yükseltin.",
  "membership.featureUnavailableOnAccount": "Bu özellik hesabınızda kullanılamıyor.",
  "listing.limitReachedInfo": "{count} hakkın tamamı kullanıldı",
  "profile.expiredListings.failedItem": "{title}: {reason}",
  "profile.expiredListings.bulkRenewed": "{count} yenilendi",
  "profile.expiredListings.bulkSubmitted": "{count} onaya gitti",
  "profile.expiredListings.bulkFailed": "{count} yenilenemedi",
};

const texts = (canBuyDigital: boolean): RenewTexts => ({
  t: (key, params) =>
    (CATALOG[key] ?? key).replace(/\{(\w+)\}/g, (_m, p) => String(params?.[p] ?? "")),
  exists: (key) => key in CATALOG,
  canBuyDigital,
});

describe("renewErrorText", () => {
  it("bilinen anahtar kullanıcı dilinde çizilir", () => {
    expect(renewErrorText("server.product.renewNotExpired", undefined, texts(true))).toBe(
      "Yalnızca süresi dolmuş ilanlar yenilenebilir.",
    );
  });

  it("katalogda olmayan anahtar → genel 'ilan yenilenemedi' (ham anahtar sızmaz)", () => {
    expect(renewErrorText("server.product.somethingNew", undefined, texts(true))).toBe(
      "İlan yenilenemedi. Lütfen tekrar deneyin.",
    );
  });

  it("dijital satış KAPALI: kurumsal satış askısı üyelik yenileme çağrısı yerine nötr metin", () => {
    expect(renewErrorText("server.product.corporateSalesSuspended", undefined, texts(false))).toBe(
      "Bu özellik hesabınızda kullanılamıyor.",
    );
  });

  it("dijital satış KAPALI: ilan limiti yükseltme çağrısı yerine sayıyla bilgi metni", () => {
    expect(
      renewErrorText("server.product.listingLimitReached", { maxListings: 5 }, texts(false)),
    ).toBe("5 hakkın tamamı kullanıldı");
  });

  it("dijital satış AÇIK: sunucu metni olduğu gibi gösterilir", () => {
    expect(renewErrorText("server.product.corporateSalesSuspended", undefined, texts(true))).toBe(
      CATALOG["server.product.corporateSalesSuspended"],
    );
  });
});

describe("renewSummary", () => {
  const batch = readRenewBatch({
    data: {
      results: [
        { id: "a", ok: true, status: "active" },
        { id: "b", ok: false, errorKey: "server.product.renewNotExpired" },
        { id: "c", ok: false, errorKey: "server.product.corporateSalesSuspended" },
      ],
      renewed: 1,
      submitted: 0,
      failed: 2,
    },
  });

  it("kısmi başarı: sayılar + başarısız ilanların 'başlık: neden' satırları; hata değil", () => {
    const s = renewSummary(batch, (id) => `T-${id}`, texts(false));
    expect(s.isError).toBe(false);
    expect(s.message.split("\n")).toEqual([
      "1 yenilendi",
      "2 yenilenemedi",
      "T-b: Yalnızca süresi dolmuş ilanlar yenilenebilir.",
      "T-c: Bu özellik hesabınızda kullanılamıyor.",
    ]);
  });

  it("hiçbiri yenilenemediyse hata", () => {
    const only = readRenewBatch({
      results: [{ id: "b", ok: false, errorKey: "server.product.renewFailed" }],
      renewed: 0,
      submitted: 0,
      failed: 1,
    });
    expect(renewSummary(only, (id) => id, texts(true)).isError).toBe(true);
  });

  it("düz ve zarflı gövdeyi aynı okur; boş gövde güvenli", () => {
    const flat = { results: [], renewed: 2, submitted: 1, failed: 0 };
    expect(readRenewBatch(flat)).toEqual(readRenewBatch({ data: flat }));
    expect(readRenewBatch(undefined)).toEqual({ results: [], renewed: 0, submitted: 0, failed: 0 });
  });
});

describe("yanıt statüsüne göre mesaj", () => {
  it("düz ve zarflı gövdede statü okunur", () => {
    expect(responseStatus({ data: { status: "active" } })).toBe("active");
    expect(responseStatus({ data: { data: { status: "pending" } } })).toBe("pending");
    expect(responseStatus(undefined)).toBeUndefined();
  });

  it("aktivasyon ve yenileme mesajı statüye bağlı", () => {
    expect(activationMessageKey({ data: { status: "active" } })).toBe("listing.reactivatedImmediately");
    expect(activationMessageKey({ data: { status: "pending" } })).toBe("listing.sentForReview");
    expect(renewMessageKey({ data: { status: "active" } })).toBe("profile.expiredListings.renewed");
    expect(renewMessageKey({ data: { data: { status: "pending" } } })).toBe("profile.expiredListings.submitted");
  });
});
