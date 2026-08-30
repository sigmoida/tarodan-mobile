# Resolution Center cevabı — taslak

Submission ID `d11dc2d7-f525-4d31-84a6-d44587a3125c` reddine karşı.
**Üç maddeye birden tek cevap** — yalnız birine cevap verilirse Apple diğer
ikisinden yeniden reddeder.

Gönderim sırası: (1) App Privacy düzeltilmiş, (2) backend + mobil düzeltmeler
yayında, (3) yeni build yüklenmiş olmalı. Cevabı **build yüklendikten sonra** yaz.

---

## Gönderilecek metin (İngilizce)

> Thank you for the detailed review. We have addressed all three items.
>
> **Guideline 5.1.2(i) — App Tracking Transparency**
>
> The app does not track users, on this or any other platform. It contains no
> advertising SDKs, no attribution or measurement SDKs, and no data brokers. The
> only third-party SDK is Sentry, used solely for crash and performance
> diagnostics. No data collected by the app is linked with third-party data for
> advertising purposes, nor shared with a data broker.
>
> The "Used for Tracking" selections in our App Privacy information were set in
> error. We have corrected them: Payment Info, Physical Address, Other Contact
> Info, Phone Number, and Email Address are no longer marked as used for
> tracking. We also removed Coarse Location entirely, as the app does not
> request or collect location data of any kind — it declares no location
> permission and contains no location APIs.
>
> As the app does not track, App Tracking Transparency does not apply and no
> permission request is present.
>
> **Guideline 5.1.1(v) — Required personal information**
>
> Date of Birth is no longer required to create an account. The field is now
> optional on the registration screen and is labelled as such; registration
> completes successfully when it is left empty. Both the app and our server
> were updated — the server no longer rejects a registration that omits the
> field. If a date is provided, we still validate it, as our Terms of Service
> require account holders to be 18 or older.
>
> **Guideline 2.1(a) — Network error during login**
>
> We reproduced and fixed this. The reviewed build (1.0 (2)) was compiled with
> an API base URL pointing to a domain that had been retired and no longer
> resolves in DNS, so every network request failed before reaching our servers
> and the login screen surfaced a generic network error. The build now points to
> our production API, and we have added an automated check to our release
> pipeline that fails the build if a store-bound configuration references an
> unreachable or missing API address.
>
> We verified sign-in, registration, browsing, and checkout on an iPad running
> the current iPadOS release before resubmitting.
>
> Test account and walkthrough are provided in the Review Notes. Please let us
> know if anything else is needed.

---

## Review Notes'a yazılacaklar (ayrı alan)

Bunlar Resolution Center cevabına değil, **App Store Connect → sürüm → App
Review Information → Notes** alanına girer. Reddin 2.1(a) maddesi giriş
ekranında çıktığı için çalışan bir hesap olmadan tekrar dönme riski yüksek.

    Demo account (buyer + seller enabled):
      Email: <doldur>
      Password: <doldur>

    The app is a Turkish collectibles marketplace. Suggested walkthrough:
    1. Sign in with the account above.
    2. Home → tap any product → product detail.
    3. Add to cart → checkout (test payment, no real charge).
    4. Profile → My Listings to see the seller side.

    Date of birth is optional at registration; the account can be created
    without it.

    The app is available in Turkish and English; language follows the device
    setting and can be changed in Profile → Settings.

    The app does not track users and contains no advertising or attribution
    SDKs; App Tracking Transparency is therefore not implemented.

---

## Göndermeden önce son kontrol

- [ ] App Privacy'de "Data Used to Track You" bölümü **yok**, Coarse Location
      listede **yok**, değişiklikler **Publish** edilmiş.
- [ ] Backend `fix/register-birthdate-optional` deploy edilmiş; doğum tarihi
      atlayan kayıt `400` almıyor (komut: `docs/APP_REVIEW_RED_2026-07-16.md` §3).
- [ ] Yeni build TestFlight'ta ve **iPad'de** login + kayıt + ürün + checkout
      elle denenmiş.
- [ ] Review Notes'taki test hesabı gerçekten çalışıyor (doğrulanmış e-posta,
      kilitli değil).
