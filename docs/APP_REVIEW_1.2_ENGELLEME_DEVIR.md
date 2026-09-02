# App Store Guideline 1.2 — kullanıcı engelleme · devir notu

Bu dosya, konuşma bağlamı taşınamadığı için yazıldı. Yeni bir oturum bunu
okuyarak kaldığı yerden devam edebilir.

> **Durum (2 Eyl 2026):** backend + admin + web ana repoda **bitti**
> (`origin/development`: `d014c1927`, `9dd975347`, `9177a4045`, `86160cc09`).
> Mobil aktarım da bu dalda **tamamlandı** — bkz. §11. Bu dosyanın 4-6.
> bölümleri artık **tarihsel kayıttır**; sözleşmenin tek kaynağı ana repodaki
> `docs/USER_BLOCKING.md`'dir. Kalan iş: sürüm 1.0.3 + ekran kaydı + Resolution
> Center cevabı (§8).

---

## 1. Nerede kaldık

Uygulama **iki kez reddedildi**.

**1. red (16 Tem 2026, sürüm 1.0(2))** — üç madde, **hepsi çözüldü**:

| Madde | Durum |
| --- | --- |
| 2.1(a) login'de ağ hatası | ✅ Kök sebep: build ölü `tarodan.shop` domainine derlenmişti. `d8c6fbb` ile düzeltildi, regresyon testi eklendi. |
| 5.1.1(v) zorunlu doğum tarihi | ✅ Kayıtta opsiyonel. Backend + mobil, ikisi de production'da canlı ve doğrulandı. |
| 5.1.2(i) ATT / gizlilik etiketi | ✅ App Privacy'de "Data Used to Track You" kaldırıldı, Coarse Location listeden çıktı. |

**2. red (1 Eyl 2026, sürüm 1.0.2(7))** — tek madde:

> **Guideline 1.2** — revise the app to implement: *a mechanism for users to
> block abusive users (blocking should also **notify the developer** of the
> inappropriate content and should **remove it from the user's feed
> instantly**)*
>
> Ayrıca **fiziksel cihazda çekilmiş bir ekran kaydı** istiyor; şunları
> göstermeli: kayıt/giriş öncesi sözleşme onayı, içeriği şikayet etme,
> kullanıcıyı engelleme.

Submission ID: `0cb52531-6138-42ce-947c-23ffe4ddd639`
İnceleme cihazları: iPhone 17 Pro Max + iPad Air 11" (M3)

**Yani kalan tek iş: kullanıcı engelleme mekanizması.**

---

## 2. Depo yapısı

| Depo | İçerik |
| --- | --- |
| `~/dev/tarodan-app` | Monorepo: `apps/api` (NestJS+Prisma), `apps/web` (Next.js), `apps/admin` |
| `~/dev/tarodan-mobile` | Yalnız mobil (Expo + expo-router). Bu depo. |

**Backend paylaşımlı** — web ve mobil aynı API'yi kullanır. Ayrışmayı önleyen
doğal nokta burası: backend'e bir kez yazılan davranıştan iki istemci de
faydalanır.

Deploy: `development` → staging, `master` → production. Migration'lar
container `entrypoint.sh`'ında `prisma migrate deploy` ile **otomatik**
uygulanıyor.

---

## 3. Apple'ın 1.2 şartları ve mevcut durum

| Gereklilik | Durum | Kanıt |
| --- | --- | --- |
| Şartların kayıttan önce kabulü (EULA) | ✅ | `RegisterForm.tsx` onay kutusu + `/terms`, `/privacy` linkleri |
| Uygunsuz içeriği **filtreleme** | ✅ güçlü | `ModerationEvent` modeli (`relevanceScore`, `nsfwScore`, `decision: pass\|review\|flag\|blocked`), `ContentFilterService` (küfür regex + `moderateWithAI`), admin `ModerationEventsPanel` |
| İçeriği **şikayet etme** | ⚠️ kısmi | `Report` modeli kalıcı + admin ekranı var. `ReportModal` dört türü destekliyor; ürün detayı ✅, mesaj başlığı ✅, **satıcı profili ❌** |
| Kötüye kullananı **engelleme** | ❌ | Aşağıya bak |
| Geliştirici iletişim bilgisi | ✅ | `app/contact.tsx` + App Store Support URL (`tarodan.com.tr/support`, 200) |

**Önemli:** filtreleme ve moderasyon zaten çalışıyor ve güçlü. Apple onlardan
şikayetçi değil. Tek boşluk engelleme.

---

## 4. Engelleme neden kırık

Zincir:

```
mobil: userApi.block(id) → POST /users/:id/block
  → UserController.blockUser → userService.blockUser → social.blockUser
```

`apps/api/src/modules/user/social/user-social.service.ts`:

```ts
private userBlocks: Map<string, UserBlock> = new Map();   // ← BELLEKTE
...
this.userBlocks.set(block.id, block);
this.logger.log(`User ${blockerId} blocked user ${blockedId}`);
return { success: true, blockedDisplayName: ... };
```

Doğrulamalar yapılıyor (kendini engelleme, kullanıcı var mı, zaten engelli mi),
sonra kayıt bellekteki Map'e yazılıyor. Prisma'ya tek satır gitmiyor.

### Sonuçları

1. **Kalıcı değil** — Prisma şemasında `UserBlock` tablosu YOK. API her yeniden
   başladığında tüm engellemeler siliniyor. (30-31 Ağu'da production iki kez
   yeniden başlatıldı.)
2. **Ölçeklenemez** — ikinci container'da engellemeler örneğe özel kalır.
3. **Hiçbir şeyi etkilemiyor** — `isUserBlocked` / `areUsersBlocked` yardımcıları
   yazılmış ama **hiçbir yerden çağrılmıyor** (yalnız `user.service.ts` üzerinden
   dışa veriliyor). Engellenen mesaj atmaya, ilanları görünmeye devam ediyor.
4. **Admin'e düşmüyor** — `user-social.service.ts` yalnız `prisma.userFollow`'a
   dokunuyor; `Report` veya `ModerationEvent` üretmiyor.
5. **Yalnız DM'den erişilebilir** — tek giriş noktası
   `app/messages/[threadId]/_hooks/useMessageThread.ts:178`. Satıcı profilinden
   veya ilandan engelleme yok.
6. **Geri alınamıyor** — `GET /users/me/blocked` ucu var, mobilde çağıran ekran yok.

### ⚠️ İsim karışıklığı

Admin panelindeki **"blocked"**, `ModerationEvent.decision` değeridir — yapay
zekanın *içerik* kararı. Bir kullanıcının başka bir kullanıcıyı engellemesiyle
ilgisi yoktur. Aynı kelime, iki ayrı sistem. "Engellenenler admin'e düşüyor"
izlenimi buradan geliyor.

---

## 5. Eksikler listesi

| # | Eksik | Katman |
| --- | --- | --- |
| 1 | Engelleme kalıcı değil (tablo yok) | backend |
| 2 | Engelleme mesajlaşmayı kesmiyor | backend |
| 3 | Engellenenin ilanları akıştan/aramadan düşmüyor | backend |
| 4 | Engelleme admin'e düşmüyor | backend |
| 5 | Yalnız DM'den erişilebilir | mobil |
| 6 | Engellenenler listesi / engel kaldırma ekranı yok | mobil |
| 7 | Satıcı profilinde şikayet yok | mobil |

**Web'de bunların HİÇBİRİ yok** — ne engelleme ne şikayet arayüzü. Tek eşleşme
`OrderItemBlock.tsx`, alakasız bir yerleşim bileşeni. Yani mobil şu an web'in
önünde.

---

## 6. Beyin fırtınasında alınan kararlar

`superpowers:brainstorming` ile ilerlendi, **mimari** yol seçildi. Onaylanan
kararlar:

1. **Engelleme semantiği: tek yönlü + mesaj kesme.** A, B'yi engellediğinde
   B'nin içeriği A'ya görünmez, B artık A'ya mesaj atamaz, mevcut sohbet A'da
   gizlenir. B tarafı etkilenmez (A'nın ilanlarını görmeye devam eder).
2. **Admin bildirimi: `Report` kaydı olarak.** Engelleme anında `type: "user"`
   bir `Report` açılır; mevcut admin şikayet ekranında görünür, pending→resolved
   akışı ve `adminNote` zaten var.
3. **Filtre kapsamı: akış + arama + mesaj.** Ürün listeleri, arama sonuçları ve
   mesajlaşma. Koleksiyon/yorum/takip **kapsam dışı** (regresyon yüzeyini
   büyütmemek için).
4. **Sıra: A planı.** Önce backend + mobil (Apple'a hızlı dönüş), web hemen
   ardından ayrı PR. Parite korunacak.

### Henüz yapılmayanlar (sürecin kalan adımları)

- 2-3 yaklaşım sunumu (kalıcılık, filtrenin merkezi mi dağıtık mı uygulanacağı)
- Bölüm bölüm tasarım + onay
- `docs/superpowers/specs/` altına spec yazımı
- `superpowers:writing-plans` ile uygulama planı
- Uygulama (TDD)

**Kod yazmaya başlanmadı.**

---

## 7. Teknik notlar (tasarımı etkileyenler)

- **Arama Prisma tabanlı** (`search-product.service.ts` → `this.prisma.product…`),
  ayrı bir arama motoru değil. Filtre tek bir `where` mantığıyla uygulanabilir.
  Ancak `SearchWorker` indeksleme job'ları da var — tasarımda netleştirilmeli.
- **`Report` modeli** `type: "user"`'ı zaten destekliyor
  (`apps/api/prisma/schema.prisma`, `model Report`).
- **`ReportModal`** (`src/components/ReportModal.tsx`) genel amaçlı:
  `'product' | 'user' | 'collection' | 'message'`, tür başına gerekçe listesi ve
  çevirileri hazır. Satıcı profiline bağlamak düşük maliyetli.
- **Migration riski düşük** — yeni tablo eklemek tamamen ek bir işlem, mevcut
  veriye dokunmuyor; deploy'da otomatik uygulanıyor.

### Anahtar dosyalar

**Backend** (`~/dev/tarodan-app`)
```
apps/api/src/modules/user/social/user-social.service.ts   ← engelleme (stub)
apps/api/src/modules/user/user.controller.ts              ← /users/:id/block
apps/api/prisma/schema.prisma                             ← Report, ModerationEvent
apps/api/src/modules/product/query/product-query.service.ts
apps/api/src/modules/search/query/search-product.service.ts
apps/api/src/modules/messaging/messaging.service.ts
apps/api/src/modules/messaging/content-filter.service.ts
```

**Mobil** (`~/dev/tarodan-mobile`)
```
src/lib/api/user.ts                                       ← block/unblock/getBlockedUsers
src/components/ReportModal.tsx                            ← genel şikayet modalı
app/messages/[threadId]/_hooks/useMessageThread.ts        ← tek engelleme noktası
app/seller/[id]/                                          ← satıcı profili (eylem yok)
app/product/[id]/_hooks/useProductActions.ts              ← ürün şikayeti
```

---

## 8. Bu iş bitince yapılacaklar

1. Yeni build **1.0.3** (`app.json` `expo.version`; version-gate buna bakıyor)
2. **Ekran kaydı** — fiziksel cihazda, sırayla: kayıt ekranındaki sözleşme
   onayı → bir içeriği şikayet etme → bir kullanıcıyı engelleme. Apple bunu
   Review Notes'a eklemenizi istiyor.
3. Resolution Center'a cevap → **Add for Review**

---

## 9. Bu konunun dışındaki açık işler

- **`EXPO_PUBLIC_SENTRY_DSN` production env'inde tanımlı değil** → Sentry
  production'da kapalı. Apple girişindeki takılma tam bu yüzden iz bırakmadı.
  Yayına çıkmadan açılmalı.
- **Yaş derecesi** — hesaplanan 4+, elle 18+'a çekilmiş (Step 7 override).
  Bilinçli değilse 13+ öneriliyor.
- **Demo hesabı satıcı değil ve ilanı yok** → Review Notes'taki
  "Profile → My Listings" adımı boş ekran gösterir. Bir ilan yayınlanmalı.
  (Hesap bilgileri App Store Connect'te; bu depoya yazılmadı.)
- **Anahtar kelimelerde marka adları** (`hot wheels`, `matchbox`) — 4.1 metadata
  riski; markasız bir liste önerilmişti.
- **Android'de ölü izinler** — `RECORD_AUDIO`, storage izinleri kullanılmıyor;
  `expo-camera` hiç kullanılmıyor (`launchCameraAsync` çağrısı yok).

---

## 10. İlgili dokümanlar

- `docs/APP_REVIEW_RED_2026-07-16.md` — birinci reddin bulguları, kök sebepleri
  ve kanıtları
- `docs/APP_REVIEW_CEVAP_TASLAGI.md` — Resolution Center cevabı ve Review Notes
  metinleri
- `docs/RELEASE.md` — gerçek yayın hattı (staging OTA / production build)

---

## 11. Mobil aktarım — yapılanlar (2 Eyl 2026)

Backend semantiği beyin fırtınasındaki karardan **daha güçlü** çıktı: engelleme
**simetrik** (iki taraf birbirini görmez) ve okuma/etkileşim kapıları tek yerde
(`UserBlockService.assertNotBlocked` / `assertVisibleTo`). Mobil bu sözleşmeyi
web ile birebir aynı yüzeylerde tüketir.

| Katman | Dosya | Ne yapıldı |
| --- | --- | --- |
| API | `src/lib/api/user.ts` | `getBlockStatus` eklendi, `block(userId, reason?)` gövde alır, `getBlockedUsers` `BlockedUser[]` tipli |
| Query key | `src/lib/query/keys.ts` | `qk.blocks.list` / `qk.blocks.status(id)`; ayrıca `seller.all` / `seller.productsAll` / `seller.collectionsAll` / `collections.detailAll` prefix kökleri |
| Hook | `src/hooks/useBlockUser.ts` | `useBlockStatus` + `useBlockUser`: onay diyaloğu, bildirim ve **invalidasyon kümesi** tek yerde (web `BLOCK_INVALIDATES` ile aynı küme) |
| Ortak bileşen | `src/components/UserActionsSheet.tsx` | Şikayet Et / Engelle / Engeli Kaldır sheet'i (`useUserActionsSheet` + hazır `UserActionsButton`) — web `UserActionsMenu` karşılığı |
| Ekran | `app/settings/blocked-users/` | Engellenenler listesi + engel kaldırma (web `profile/blocked` karşılığı) |
| Profil menüsü | `app/(tabs)/_components/ProfileSections.tsx` | "Engellenen Kullanıcılar" satırı |
| Satıcı profili | `app/seller/[id]/` | Başlıkta "…" menüsü: kullanıcıyı şikayet + engelle (kendi vitrininde gizli) |
| İlan detayı | `app/product/[id]/` | Bayrak düğmesi artık sheet açar: "İlanı Şikayet Et" + "Satıcıyı Engelle" |
| Koleksiyon detayı | `app/collections/[id]/` | Sahibi değilsen şikayet bayrağı |
| DM | `app/messages/[threadId]/` | Elle yazılmış `userApi.block` çağrısı paylaşılan hook'a taşındı; engelliyse "Engeli Kaldır" gösterir |
| i18n | `src/i18n/lib/catalog/{tr,en}.json` | `profile.block*` / `profile.blockedPage.*` / `collection.report` eklendi; ölü `message.block*` anahtarları silindi |

Testler: `src/hooks/__tests__/useBlockUser.test.tsx` (onay kapısı, invalidasyon
kümesi, engel durumu sorgusunun kapıları) ve
`app/settings/__tests__/blocked-users.test.tsx` (liste, boş durum, engel kaldırma).

**Doğrulama:** `npx tsc --noEmit` temiz, `pnpm lint` 0 hata,
`pnpm test` 216 süit / 1712 test yeşil.

**Simülatörde uçtan uca denendi** (iPhone 17, dev build + Metro, staging
backend — EAS build harcanmadı). Yeni e2e akış:
`maestro/flows/G-01-block-user.yaml` — arama → ilan detayı → bayrak menüsü
("İlanı Şikayet Et" + "Satıcıyı Engelle") → onay → Profil → Engellenen
Kullanıcılar → Engeli Kaldır → boş durum. Tamamı yeşil.

Ayrıca elle doğrulananlar:
- Satıcı profili başlığındaki "⋮" → Şikayet Et / Engelle sheet'i.
- DM başlığı → Profili Görüntüle / Şikayet Et / Engelle.
- **Apple'ın asıl şartı:** engelledikten hemen sonra `tarodan://seller/<id>` ve
  `tarodan://product/<id>` derin bağlantıları "bulunamadı" veriyor — içerik
  akıştan anında düşüyor.
- Test sonunda engel kaldırıldı; staging verisi temiz bırakıldı.

### Denemede çıkan üç gerçek kusur (düzeltildi)

1. **`AlertDialog` erişilebilirlik**: dıştaki dokunulabilir `Pressable`'lar iOS'ta
   tüm diyaloğu TEK erişilebilirlik öğesine çökertiyordu — VoiceOver diyaloğu tek
   blok okuyor, düğmeleri ayrı seçemiyordu. `accessible={false}` ile düzeltildi.
2. **`BlockedUserRow` çökmesi**: geçersiz locale/tarih ile `toLocaleDateString`
   `RangeError` atıp satırı düşürüyordu; artık korumalı.
3. **Tutarsız iptal etiketi**: DM menüsü "Vazgeç" (`discount.discard`), diğer
   sheet'ler "İptal" (`common.cancel`) diyordu — hepsi `common.cancel`.

Bayat kalmış `maestro/subflows/open-tarodan.yaml` de düzeltildi: dev-client
sunucu satırı artık port'u da yazıyor (regex şart) ve iOS'un "Açılsın mı?"
uyarısı dokunuştan SONRA çıkıyor (sıra yanlıştı).

### Bu bölümdeki bilinçli kararlar

- **Engelleme onayı `appAlert` üzerinden** — web'deki `useConfirm` diyaloğunun
  karşılığı. Yanlışlıkla engelleme olmasın diye API çağrısı onaydan sonra.
- **Bildirim kanalı çağırana bırakıldı** — snackbar'ı olan ekranlar (ilan
  detayı) `notify` geçer, olmayanlar `appAlert` görür.
- **İlan detayında kullanıcı şikayeti yok** — orada şikayet edilen şey ilanın
  kendisi (web ile aynı); kullanıcıyı şikayet satıcı profilinde ve DM'de.
