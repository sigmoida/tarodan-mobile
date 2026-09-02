# Resolution Center cevabı — Guideline 1.2 (ikinci red)

Submission ID `0cb52531-6138-42ce-947c-23ffe4ddd639` reddine karşı.
Tek madde: **Guideline 1.2 — kullanıcı tarafından üretilen içerik**.

Apple'ın istediği üç şey vardı:

1. Kötüye kullanan kullanıcıyı **engelleme** mekanizması,
2. engellemenin **geliştiriciye bildirim** düşürmesi,
3. engellenen içeriğin kullanıcının akışından **anında kalkması**.

Üçü de karşılandı (bkz. `APP_REVIEW_1.2_ENGELLEME_DEVIR.md` §11 ve ana repo
`docs/USER_BLOCKING.md`). Ayrıca **fiziksel cihazda çekilmiş bir ekran kaydı**
istendi — aşağıdaki senaryo.

Gönderim sırası: (1) 1.0.3 build TestFlight'ta ve elle denenmiş,
(2) ekran kaydı çekilmiş ve Review Notes'a linki konmuş, (3) cevap yazılıp
**Add for Review**.

---

## Gönderilecek metin (İngilizce)

> Thank you for the review. We have implemented a full blocking mechanism in
> build 1.0.3.
>
> **Blocking abusive users.** A signed-in user can block another user from
> three places: the seller's profile (the ⋮ menu in the header), a listing
> detail screen (the flag icon → "Block seller"), and a conversation (the ⋮
> menu in the chat header). Blocking asks for confirmation and explains its
> effect. Blocks are listed under Profile → Blocked Users, where they can be
> lifted at any time.
>
> **The block is persistent and symmetric.** It is stored server-side, so it
> survives app restarts and applies across devices. Once a block is in place,
> neither party can see the other's listings, collections or profile, and
> messages, offers and trades are refused in both directions. Any pending
> follow relationship is removed.
>
> **The developer is notified.** Every block and every content report raises an
> in-app notification to all active administrators of our platform, carrying
> the reporter, the target, the reason, and the reported content. Our admin
> panel shows the reports queue and, on each user's page, the blocks given and
> received.
>
> **Blocked content leaves the feed immediately.** The blocked user's listings
> disappear from the home feed, search results, autocomplete, collections and
> the wishlist as soon as the block is placed; their profile and listing pages
> return "not found"; and their conversations drop out of the message list and
> the unread badge. We verified this on a device: immediately after blocking,
> opening a direct link to the blocked seller's profile or listing shows the
> "not found" screen.
>
> **Reporting content.** Reporting was already available and remains so, now on
> every surface: a listing, a user (from their profile or from a conversation),
> and a collection. Each report is stored, raises an admin notification, and is
> triaged in our admin panel.
>
> **Terms of service before registration.** The registration screen requires
> the user to tick "I accept the terms of use and the privacy policy" before an
> account can be created; the form cannot be submitted without it. The Terms of
> Service and the Privacy Policy are linked from that line and are also
> reachable from Profile → Settings.
>
> A screen recording made on a physical iPhone is provided in the Review Notes.
> It shows, in order: accepting the terms during registration, reporting a
> listing, and blocking a user (including the blocked user's content
> disappearing) and then unblocking from Profile → Blocked Users.
>
> Please let us know if anything else is needed.

---

## Review Notes'a yazılacaklar

App Store Connect → sürüm → **App Review Information → Notes**. Önceki
gönderimdeki metin korunur, altına şu blok eklenir:

    User-generated content safeguards (Guideline 1.2):

    Blocking a user — any of:
      • Seller profile → ⋮ (top right) → Block
      • Listing detail → flag icon (top right) → Block seller
      • Conversation → ⋮ (top right) → Block
    Blocks are listed under Profile → Blocked Users and can be lifted there.

    Reporting content:
      • Listing detail → flag icon → Report listing
      • Seller profile → ⋮ → Report
      • Conversation → ⋮ → Report
      • Collection detail → flag icon

    Terms of service are accepted with a mandatory checkbox on the
    registration screen before an account is created.

    Screen recording (physical iPhone): <link>

> **Demo hesabı uyarısı** — önceki gönderimden kalan açık madde: Review
> Notes'taki hesabın **satıcı olması ve en az bir yayında ilanı bulunması**
> gerekiyor, yoksa "Profile → My Listings" boş ekran gösterir. Engelleme
> akışının denenebilmesi için hesabın **başka bir satıcının ilanını görebiliyor**
> olması da şart (kendi ilanında engelleme menüsü çıkmaz — doğru davranış).

---

## Ekran kaydı senaryosu (fiziksel cihaz)

Apple açıkça **fiziksel cihazda** çekilmiş kayıt istiyor; simülatör kaydı
kabul edilmiyor. iPhone'da Kontrol Merkezi → Ekran Kaydı. Tek parça, kesintisiz
çekin; ses gerekmez. Hedef süre 60-90 sn.

**Hazırlık**

- Cihazda 1.0.3 TestFlight build'i kurulu olsun.
- Kayda başlamadan önce uygulamadan **çıkış yapın** (senaryo kayıt ekranıyla
  başlıyor).
- Engellenecek kullanıcı **kendiniz olmayan** bir satıcı olsun.

**Adımlar**

1. **Sözleşme onayı (kayıt öncesi)**
   Uygulamayı aç → *Kayıt Ol*. Formu doldurmadan aşağı in ve
   *"Kullanım koşullarını ve gizlilik politikasını kabul ediyorum"* satırını
   göster. Kutuyu **işaretlemeden** *Kayıt Ol*'a bas → hata mesajı görünsün.
   Sonra kutuyu işaretle. (Sözleşme linkine dokunup metnin açıldığını 2-3 sn
   göstermek iyi olur, sonra geri dön.)
   *Not: hesabı gerçekten oluşturmanız gerekmez; onayın zorunlu olduğunu
   göstermek yeterli. Kaydı tamamlamayacaksanız buradan geri çıkıp mevcut demo
   hesabıyla giriş yapın.*

2. **İçeriği şikayet etme**
   Ana sayfa → herhangi bir ilana gir → sağ üstteki **bayrak** ikonuna dokun →
   açılan menüde *İlanı Şikayet Et*'i seç → bir gerekçe seç → onay mesajını
   göster.

3. **Kullanıcıyı engelleme**
   Aynı ilanda tekrar **bayrak** ikonuna dokun → *Satıcıyı Engelle* → çıkan
   onay metnini (ne olacağını anlatıyor) 2 sn göster → *Engelle*'ye bas →
   başarı mesajını göster.

4. **İçeriğin akıştan anında düşmesi**
   Geri dönüp **Ara** sekmesinde o satıcının ilanını aratın veya ana sayfada
   listelerde artık görünmediğini gösterin. (Daha güçlüsü: engellemeden önce
   ilanın göründüğü bir arama sonucunu kaydedin, engelledikten sonra aynı
   aramayı tekrarlayın.)

5. **Engellenenler listesi ve engeli kaldırma**
   *Profil* → aşağı in → **Engellenen Kullanıcılar** → engellenen kişinin
   listede olduğunu göster → *Engeli Kaldır* → liste boşalsın.

Kaydı bitirin. Dosyayı bir yere yükleyip (ör. Google Drive, herkese açık link)
adresini Review Notes'a yazın.

---

## Göndermeden önce son kontrol

- [ ] `app.json` `expo.version` = **1.0.3** ve `master`'a merge edilmiş
      (production workflow yalnız sürüm değişince build alır).
- [ ] Build TestFlight'ta; **fiziksel iPhone'da** engelleme akışı elle denenmiş.
- [ ] Review Notes'taki demo hesabı çalışıyor, **satıcı** ve en az **bir yayında
      ilanı** var.
- [ ] Ekran kaydı fiziksel cihazda çekilmiş, linki Review Notes'ta ve link
      oturum açmadan erişilebilir.
- [ ] Test sırasında konulan engeller **kaldırılmış** (production verisi temiz).
- [ ] Resolution Center cevabı yazılıp **Add for Review**.

### Bu build'e giren, engellemeyle ilgisiz düzeltme

**Tarih alanı bir gün geri gösteriyordu.** `DateField` seçilen tarihi
`toLocaleDateString` ile biçimlendiriyordu; iOS'ta (Hermes) saat dilimi
verilmediğinde bu UTC'de biçimlendiriliyor ve **UTC+3'te bir önceki gün**
yazılıyordu — Türkiye'deki her kullanıcı için. Kullanıcı 1 Ocak 1990 seçiyor,
alanda "31 Aralık 1989" görüyordu (saklanan değer doğruydu, yalnız gösterim
yanlıştı — ama kullanıcı "düzeltmeye" kalkarsa yanlış tarih kaydeder).
Etkilenen üç alan: kayıt ve profil düzenlemedeki **doğum tarihi**, ilan
formundaki **indirim başlangıç/bitiş** tarihleri. Doğum tarihi Apple'ın
5.1.1(v) maddesinde zaten mercek altındaydı; bu build'e alınması isabetli.

Jest bunu yakalayamaz: Node'un `Intl`'i doğru davranıyor, hata yalnız iOS
motorunda görünüyor. Bu yüzden regresyon testi yerine düzeltme, nedeniyle
birlikte koda yorum olarak yazıldı.

### Bu build'e girmeyen, sonraya bırakılan maddeler

Native yüzeye dokunan her değişiklik yeni bir başarısızlık yolu açtığı ve bu
build'i tekrar veremeyeceğimiz için bilinçli olarak ertelendi:

- **`expo-camera` bağımlılığı hiç kullanılmıyor** (`launchCameraAsync` yok);
  Android'deki `RECORD_AUDIO` ve storage izinleri de ölü. Android yayında
  olmadığı için ikisi de şu an inceleme riski değil.
- **`EXPO_PUBLIC_SENTRY_DSN` production'da tanımsız** → Sentry production'da
  kapalı, bir sonraki red yine iz bırakmaz. Build almadan önce eklenebilir:
  `eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value <dsn>`
  (DSN depoda yok, Sentry projesinden alınacak). Bu bir env değişikliği; JS
  tarafında `services/sentry.ts` zaten hazır.
- **Yaş derecesi** App Store Connect'te elle 18+'a çekilmiş (hesaplanan 4+).
  Bilinçli değilse 13+ öneriliyor.
- **Anahtar kelimelerdeki marka adları** (`hot wheels`, `matchbox`) — 4.1
  metadata riski.
