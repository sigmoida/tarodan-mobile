# App Review — dördüncü gönderim (1.0.5)

Üçüncü red (Submission `0cb52531-6138-42ce-947c-23ffe4ddd639`, 5 Eyl 2026, 1.0.3 (8))
cevapsız kaldı; Apple 29 Eyl'de "The issues we previously identified still need
your attention" diye hatırlattı. Bu dosya o reddin dört maddesine **1.0.5** ile
verilen tek cevaptır. Eski cevap dosyaları (`APP_REVIEW_CEVAP_1.2.md`,
`APP_REVIEW_CEVAP_3_UCUNCU_RED.md`) geçmiş kaydıdır; gönderilecek metin burası.

## Göndermeden önce — kontrol listesi

**İçerik (test şeridi — admin panelinden, süper-admin gerekir)**
- [ ] **İki** test satıcısı açıldı (Sistem → Test Araçları → Test Şeridi,
      "Satıcı olarak aç"). İki tane: reviewer 1.2 için birini engellediğinde
      vitrin boşalmasın.
- [ ] Satıcılara toplam 4–8 ilan girildi — gerçek fotoğraf (en az 3), başlıkta
      "test" yok, ana sayfadaki marka/ölçek raylarına denk gelen birkaç marka ve
      ölçek. İlanlar **onaylandı** (yeni ilan `pending` düşer).
- [ ] Apple Test hesabının kendi "Test Product" ilanı **silindi** — hesabında
      aktif ilan varken sunucu hesap silmeyi reddeder (5.1.1(v) testi).
- [ ] Satıcı hesabından Apple Test hesabına 2–3 mesaj; birkaç favori.
- [ ] Apple Test hesabına **ücretli kademe atanmadı** (atanırsa iOS'ta
      "Premium üyelik / sonraki ödeme" gibi abonelik referansları görünür).
- [ ] Ölçüm: Apple Test token'ıyla `GET /api/products` en az 4 ilan döndürüyor.

**Backend (ana repo — yapılmadan Resolution Center'da iddia edilmeyecekler var)**
- [ ] `AI_MODERATION_ENABLED` production değeri öğrenildi. Kapalıysa metin
      filtresi (ilan düzenleme, koleksiyon, profil, yorum) hiç çalışmıyor —
      `assertTextClean` / `assertCleanComment` deterministik küfür listesini de
      atlıyor. Açılmadan aşağıdaki filtreleme paragrafının köşeli parantezli
      cümlesi **gönderilmez**.
- [ ] `GET /collections/browse` test şeridine göre süzülmüyor (test hesabına canlı
      koleksiyonlar listeleniyor, detayı 404).
- [ ] (Sonraki sürüm) Sunucu "Üyeliğinizi yükseltin" metinlerini platforma göre
      nötr döndürsün; mobil iOS'ta şimdilik istemcide nötrleştiriyor.
- [ ] (Sonraki sürüm) Teklif ve takas mesajları filtrelenmiyor; yorumlar için
      `ReportType.REVIEW` yok ve engellenenin yorumları sunucuda süzülmüyor.
- [ ] (Sonraki sürüm) Test şeridinde sipariş `shipped`'te kalıyor —
      `delivered`'a geçiş yok (dokümandaki "alıcı teslim aldım der" akışı
      çalışmıyor).

**App Store Connect**
- [ ] App Privacy → Privacy Policy URL = `https://tarodan.com.tr/privacy`
- [ ] App Description'a Kullanım Koşulları linki (`https://tarodan.com.tr/terms`)
      ya da License Agreement alanı
- [ ] Taslak abonelik / IAP ürünleri silindi ya da "Remove from Sale"
- [ ] Review Notes aşağıdaki blokla güncellendi, ekran kaydı linki oturumsuz açılıyor

**Build ve ekran kaydı**
- [ ] 1.0.5 TestFlight'ta, **fiziksel cihazda** gezildi (misafir → giriş,
      satın alma PayTR test kartıyla, ilan oluşturma, şikayet, engelleme,
      hesap silme menüsü)
- [ ] Ekran kaydı **1.0.5 ile yeniden** çekildi (eski kayıt 1.0.3; giriş
      ekranındaki koşul satırını göstermiyor). Sıra: giriş ekranı koşul satırı →
      kayıt ekranı onay kutusu → ilan şikayeti → satıcıyı engelleme ve ilanlarının
      akıştan kalkması → Profil → Engellenen Kullanıcılar → engeli kaldırma.

## 1.0.5'te değişenler (Apple'a karşı)

| Madde | Değişiklik |
|---|---|
| 1.2 | Giriş ekranında Kullanım Koşulları + Gizlilik bildirimi (Apple/Google ile giriş hesap açıyordu, koşul görmüyordu); koşullara sıfır tolerans maddesi; yorumcunun adı profiline bağlandı (şikayet/engelleme orada); engelleme sonrası temizlenen listeler genişledi; misafir koleksiyon şikayeti girişe yönlenir |
| 2.1 | Girişte önbellek sıfırlanır (misafirken görülen canlı ilanlar "Ürün bulunamadı" veriyordu); iPad dikey tam ekrana kilitlendi; ilan formu sunucunun zorunlu alanlarına uyduruldu (renk, kutu durumu — mobilden ilan oluşturma 29 Temmuz'dan beri bozuktu); yer tutucu telefon numaraları, geliştirici metinleri ve teşhis ekranları kaldırıldı; profildeki Gizlilik/Koşullar 404 veriyordu; iOS donmasına yol açan Modal+uyarı çakışmaları (adres formu, ilanlarım) düzeltildi; kabul edilen teklifin ödeme düğmesi düzeltildi |
| 2.1(b) / 3.1.x | iOS'ta kalan abonelik referansları kaldırıldı: ödeme formundaki "otomatik yenileme için kaydet", Kayıtlı Kartlarım, ücretsiz kullanıcıda Üyelik Planı/Aboneliğim, Premium karakter notu, satıcı kaydındaki kademe avantajları, kurumsal hesabın üyelik ekranına kilitlenmesi; sunucunun "Üyeliğinizi yükseltin" hata metinleri iOS'ta nötrleştirilir; yetkisiz kullanıcıya takas/koleksiyon girişleri gösterilmez |
| 5.1.1 | Kullanılmayan kamera, mikrofon ve Face ID izinleri kaldırıldı; galeri izninin açıklaması genişletildi ve İngilizce karşılığı eklendi |

---

## Resolution Center'a gönderilecek metin (İngilizce)

> Thank you for your patience. Build 1.0.5 addresses every item below.
>
> **Guideline 1.2 — User-Generated Content**
>
> *Terms of use before registering or signing in.* Registration requires ticking
> "I accept the terms of use and the privacy policy". The sign-in screen —
> including Sign in with Apple and Google, which can create an account on first
> use — states that continuing means accepting the Terms of Use and the Privacy
> Policy, with both linked right there. The Terms state that we have zero
> tolerance for objectionable content and abusive users, explain how to report
> and block, and commit to reviewing reports within 24 hours, removing
> offending content and suspending the account that posted it.
>
> *Filtering objectionable content.* New listings are held for review and only
> published after a moderator approves them. Direct messages pass through a
> server-side filter (a profanity list, administrator-managed rules and an
> automated moderation service) before they are delivered.
> [Listing edits, collection names, profile names and bios, reviews and every
> uploaded image are checked by the same automated moderation service.]
>
> *Flagging objectionable content.* Listings (flag icon → Report listing),
> collections (flag icon), and users (the ⋮ menu on their profile or in a
> conversation) can be reported; the author of a review can be reached by
> tapping their name. Every report is stored and raises a notification to our
> administrators.
>
> *Blocking abusive users.* A user can be blocked from their profile (⋮ → Block),
> from a listing (flag icon → Block seller) and from a conversation (⋮ → Block).
> Blocking notifies our administrators, and the blocked user's listings,
> collections, profile and conversations are removed from the blocker's feed
> immediately. Blocks can be lifted under Profile → Blocked Users.
>
> A screen recording made on a physical device is linked in the Review Notes.
>
> **Guideline 2.1 — Demo account**
>
> The demo account in the Review Notes is signed into an isolated test
> environment on our production service. It is pre-populated with listings from
> test sellers, conversations and favorites. Payments run in our payment
> provider's test mode (no money is taken) — a test card is in the Review Notes —
> and shipping tracking numbers are simulated.
>
> **Guideline 2.1(b) — In-App Purchase**
>
> The app no longer offers any digital purchase on iOS. Membership plans and
> listing promotion are not sold in the app, no prices are shown, and there are
> no links or calls to action pointing to any external purchase mechanism. The
> collectible models sold on the marketplace are physical goods and are paid for
> outside In-App Purchase, as required by Guideline 3.1.3(e).
>
> **Guideline 3.1.2(c) — Subscriptions**
>
> Because no subscription is offered in the app, the subscription disclosure
> requirements no longer apply to the binary. Our Privacy Policy
> (https://tarodan.com.tr/privacy) and Terms of Use
> (https://tarodan.com.tr/terms) are linked from the sign-in and registration
> screens and from Profile, and in App Store Connect.

**Köşeli parantezli cümle:** yalnız backend `AI_MODERATION_ENABLED=true` (ya da
deterministik filtrenin koşulsuz çalışması) doğrulandıktan sonra gönder; aksi
halde köşeli parantezli cümleyi sil.

## Review Notes (App Store Connect → App Review Information → Notes)

Notes alanı en fazla 4000 karakter; bu metin ~3200. `<CARD NUMBER>`, `<MM/YY>`,
`<CVV>` PayTR paneli → Test Kartları'ndan, `<LINK>` 1.0.5 ekran kaydından
doldurulur. Köşeli parantez yok — buradaki filtreleme cümlesi yalnız doğrulanmış
davranışı (mesaj filtresi, ilanların yayından önce incelemeye alınması) anlatır.

    DEMO ACCOUNT
      Email:    homier-moving.80@icloud.com
      Password: *toer12coeR*
    Please sign in before testing. Please do not change the password or enable two-factor authentication on this shared account.

    Tarodan is a Turkish marketplace for collectible diecast models. The app follows the device language (Turkish or English); it can also be changed in Profile → Settings. On iPad it runs full screen in portrait.

    GUEST MODE vs DEMO ACCOUNT
    Browsing as a guest shows our live marketplace with real sellers. The demo account is signed into an isolated test environment on our production service: it only sees listings from test sellers (currently Model Garaj and Kadıköy Diecast), and nothing done with it reaches real users. Conversations and a favorite are pre-populated. Please use the demo account for purchases.

    PAYMENTS (test mode)
    Collectible models are physical goods and are paid with our payment provider PayTR, as required by Guideline 3.1.3(e). For the demo account PayTR runs in test mode: no money is taken.
      Test card:   <CARD NUMBER>
      Expiry:      <MM/YY>   CVV: <CVV>
    The bank's 3D Secure page appears as in production. After payment the order appears under Profile → My Orders. Shipping is simulated: the tracking number starts with "TEST" and does not move on the carrier's site, and no e-invoice is issued in this environment.
    No digital goods (memberships, listing promotion) are sold in the iOS app.

    USER-GENERATED CONTENT (Guideline 1.2)
    Terms of Use: shown on the sign-in screen below the Apple/Google buttons ("By signing in or continuing with Apple or Google, you agree to our Terms of Use and Privacy Policy") and accepted with a required checkbox on the registration screen. Section 10 states zero tolerance for objectionable content and abusive users; reports are reviewed within 24 hours.

    Filtering: new listings are held for review before they are published; messages pass a server-side filter (profanity list and administrator-managed rules) before delivery.

    Report:
      • Listing → flag icon (top right) → Report Listing
      • Seller profile → ⋮ → Report
      • Conversation → ⋮ → Report
      • Collection → flag icon
      • Review author: tap their name to open the profile
    Block:
      • Listing → flag icon → Block seller
      • Seller profile (tap the seller card) → ⋮ → Block
      • Conversation → ⋮ → Block
    The blocked user's listings, profile and conversations disappear from the feed, search and messages immediately. Every report and block notifies our administrators. Unblock under Profile → Blocked Users.

    Screen recording (physical iPhone, build 1.0.5): <LINK>
    It shows the Terms on the sign-in and registration screens, reporting a listing and a user, blocking with the content removed from the feed, search and messages, and unblocking.

    OTHER
    • Selling: the demo account can create a listing with the + button in the tab bar. A bank account is already on file; a listing needs at least 3 photos and is reviewed before it is published.
    • Account deletion: Profile → bottom of the page → Delete Account.
    • Date of birth is optional at registration.
    • No tracking, advertising or attribution SDKs, so App Tracking Transparency is not implemented.
    • Questions: destek@tarodan.com.tr
