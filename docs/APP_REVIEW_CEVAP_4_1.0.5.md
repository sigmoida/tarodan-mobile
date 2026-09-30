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

    Demo account (isolated test environment on our production service):
      Email:    <Apple Test e-postası>
      Password: <şifre>
    Please sign in with this account before testing purchases. Browsing as a
    guest shows the live marketplace.
    Please do not change the password or enable two-factor authentication on
    this shared account.

    Payments run in our payment provider's (PayTR) test mode; no money is taken.
    Test card: <PayTR panelindeki test kartı — numara / SKT / CVV>
    The 3D Secure page appears as in production. Shipping tracking numbers in
    this environment are simulated.

    User-generated content (Guideline 1.2):
      Report a listing:  listing → flag icon (top right) → Report listing
      Block a user:      listing → flag icon → Block seller,
                         or seller profile → ⋮ → Block,
                         or conversation → ⋮ → Block
      Report a user:     seller profile → ⋮ → Report
      Unblock:           Profile → Blocked Users
      Terms of Use:      sign-in screen (below the Apple/Google buttons),
                         registration screen (required checkbox)
    Screen recording (physical device, build 1.0.5): <link>

    Account deletion: Profile → bottom of the page → Delete Account.

    Digital purchases (memberships, listing promotion) are not offered on iOS.
    Physical goods are paid with PayTR, as required by Guideline 3.1.3(e).
