/**
 * Parite C-3.2 · satıcı kaldırma nedeni kuralı (API `listingRemovalIssue` seller aktörü ile aynı).
 */
import {
  REMOVAL_DETAIL_MAX_LENGTH,
  SELLER_REMOVAL_REASONS,
  listingRemovalSchema,
  removalIssue,
  toRemovalPayload,
} from "../removal";

describe("removalIssue", () => {
  it("neden zorunlu", () => {
    expect(removalIssue("delete", {})).toBe("reason_required");
  });

  it("geçici duraklatma yalnız pasife almada vardır; silmede izinli değil", () => {
    expect(SELLER_REMOVAL_REASONS.delete).not.toContain("paused_temporarily");
    expect(removalIssue("delete", { removalReason: "paused_temporarily" })).toBe("reason_not_allowed");
    expect(removalIssue("deactivate", { removalReason: "paused_temporarily" })).toBeNull();
  });

  it("'not_given' ve yönetici nedeni formdan seçilemez", () => {
    expect(removalIssue("deactivate", { removalReason: "not_given" })).toBe("reason_not_allowed");
    expect(removalIssue("delete", { removalReason: "policy_violation" })).toBe("reason_not_allowed");
  });

  it("başka platformda satış platform ister; 'other' ise açıklama da", () => {
    expect(removalIssue("delete", { removalReason: "sold_elsewhere" })).toBe("platform_required");
    expect(removalIssue("delete", { removalReason: "sold_elsewhere", removalPlatform: "x" })).toBe(
      "platform_invalid",
    );
    expect(removalIssue("delete", { removalReason: "sold_elsewhere", removalPlatform: "other" })).toBe(
      "detail_required",
    );
    expect(
      removalIssue("delete", {
        removalReason: "sold_elsewhere",
        removalPlatform: "other",
        removalDetail: "Facebook",
      }),
    ).toBeNull();
  });

  it("platform yalnız 'sold_elsewhere' ile gönderilebilir", () => {
    expect(removalIssue("delete", { removalReason: "changed_mind", removalPlatform: "dolap" })).toBe(
      "platform_not_allowed",
    );
  });

  it("açıklama en fazla 500 karakter", () => {
    expect(
      removalIssue("delete", {
        removalReason: "changed_mind",
        removalDetail: "a".repeat(REMOVAL_DETAIL_MAX_LENGTH + 1),
      }),
    ).toBe("detail_too_long");
  });
});

describe("toRemovalPayload", () => {
  it("platform yalnız 'sold_elsewhere'e aittir; neden değişince eski platform gönderilmez", () => {
    expect(toRemovalPayload({ reason: "changed_mind", platform: "dolap", detail: "" })).toEqual({
      removalReason: "changed_mind",
      removalPlatform: undefined,
      removalDetail: undefined,
    });
  });

  it("metin kırpılır, boş string undefined olur", () => {
    expect(toRemovalPayload({ reason: "sold_elsewhere", platform: "dolap", detail: "  elden  " })).toEqual({
      removalReason: "sold_elsewhere",
      removalPlatform: "dolap",
      removalDetail: "elden",
    });
  });
});

describe("listingRemovalSchema", () => {
  const t = ((key: string) => key) as never;

  it("hata, sorunun ait olduğu alana ve doğrulama anahtarıyla bağlanır", () => {
    const res = listingRemovalSchema(t, "delete").safeParse({
      reason: "sold_elsewhere",
      platform: "",
      detail: "",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].path).toEqual(["platform"]);
      expect(res.error.issues[0].message).toBe("validation.listingRemoval.platform_required");
    }
  });

  it("geçerli giriş geçer", () => {
    expect(
      listingRemovalSchema(t, "deactivate").safeParse({ reason: "paused_temporarily", platform: "", detail: "" })
        .success,
    ).toBe(true);
  });
});
