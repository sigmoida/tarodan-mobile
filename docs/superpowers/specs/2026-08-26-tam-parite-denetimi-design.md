# Tam parite denetimi — tasarım

**Tarih:** 2026-08-26
**Durum:** onaylandı, uygulama planı bekliyor
**Referans:** `tarodan-app` `origin/development` @ `9f2f66bfc` (2026-08-22)

## Problem

Mobil istemci 2026-07-24'te ana repodan ayrıldı (`b8f08d335` ana repodaki
`apps/mobile`'ı sildi). O günden beri parite dört turda ölçüldü, ama her tur
**dokümana ya da DTO diffine** dayandı. Bu oturumda o yöntemin deliği ortaya
çıktı: iki tur üst üste, sunucunun **iç içe ve DTO'suz** alanlarını kaçırdı.

Somut kaçırılanlar (hepsi staging'de doğrulandı ve kapatıldı):

- `pricing.summary` **yedi** alan döndürüyor, mobilin tipi **dördünü** tanıyordu.
  Kampanya indirimleri sepette/checkout'ta etiketsiz eriyordu.
- `GET /products/my` `rejectionReason` yayınlıyor; satıcı ilanının neden
  reddedildiğini uygulamanın hiçbir yerinde göremiyordu.
- Üyelik ekranları karşılığı olmayan bir "Reklamsız deneyim" vaadi taşıyordu
  (sunucu her katman için `isAdFree: null`).
- Çok satıcılı sipariş yalnız kalem kalem iptal edilebiliyordu; grup ucu vardı.

Sebep tek: `dto/**` + `*.controller.ts` diffi, yanıt gövdesini **serviste** kuran
alanları göstermiyor.

Ayrıca kapsam boşluğu var: 2026-07-24 → 08-07 aralığındaki **250 commit**
(147'si admin dışı `feat`/`fix`) hiç doğrudan incelenmedi.

## Hedef

Ana repo ile mobil arasındaki parite farklarını, kalan aralığı da kapsayarak,
kaçırma sınıfını kapatan bir yöntemle çıkarmak; bulguları kullanıcı zararına
göre sıralanmış tasklara bölüp her birini ayrı ayrı doğrulayarak kapatmak.

## Yöntem

### Faz 1 — Sözleşme taraması (çapraz doğrulamalı)

Kaynaktan enumerate + staging'den ölç. Üç sonuç:

| Kaynakta | Staging'de | Mobilde | Sonuç |
|---|---|---|---|
| var | var | yok | **boşluk** → task |
| var | yok | — | **deploy edilmemiş** → rapora yaz, tip yazma |
| — | var | — | yöntem hatası → enumerate adımına dön |

Yalnız ölçüme ya da yalnız kaynağa dayanmak yetmiyor: ölçüm, demo hesabında
verisi olmayan alanın şeklini göstermiyor (`feeDiscounts` her ölçümde `[]`);
kaynak ise deploy edilmemiş alanı "var" sayıyor (delta 19'da renk seed'i tam
böyle yanlış okunacaktı).

**Kapsam:** mobilin çağırdığı 206 ucun hepsi değil, para/durum/kullanıcı verisi
render eden yaklaşık 40'ı — `orders`, `checkout`, `trades`, `products`,
`membership`, `user`, `messaging`. `catalog`/`media`/`ads` dışarıda: sabit veri,
kaçırma riski düşük.

### Faz 2 — Süzülmüş commit taraması

`d7df71e80..94f372e1b` aralığındaki 147 admin-dışı `feat`/`fix` commit'inden
kullanıcıya görünen ~80'i yürünür. Okunmadan elenen sınıflar, hepsi web'e özgü:
CSP, çerez onayı, footer/dropdown/grid düzeni, Sentry etiketleme, dinamik
render, Universal Links dosyası sunma.

Her aday mobile karşı kontrol edilir; şüpheli olan staging'den ölçülür.

### Faz 3 — Denetim raporu

`docs/superpowers/reports/2026-08-26-tam-parite-denetimi.md`: her bulgu için
ölçüm (ham gövde dahil), kullanıcı etkisi, tahmini maliyet, ve backend bekleyip
beklemediği.

### Faz 4 — Uygulama

Bulgular tasklara bölünür ve sırayla kapatılır.

## Task modeli

**Birim:** bir davranış = bir task = bir commit = en az bir test. Bir davranış
iki ekranı ilgilendiriyorsa (aynı özet bileşeni hem sepette hem checkout'ta) tek
task kalır — bölmek yarım düzeltme riski üretir.

**Sıralama — kullanıcı zararına göre, akış içinde gruplanmış:**

| Öncelik | Sınıf |
|---|---|
| P0 | Para veya veri kaybı üreten |
| P1 | Kullanıcıya görünen eksik/yanlış bilgi |
| P2 | Sessiz yalan — bugün görünmüyor, sonra patlar |
| P3 | Eksik yetenek, kayıp yok |
| — | Backend/ops bekleyen: task DEĞİL, rapora devredilir |

**Akış sırası:** checkout/sepet → siparişler → takas → ilanlar → üyelik →
mesaj/bildirim → profil/ayarlar. Para akışları önde.

Akış içinde gruplama, elle doğrulama listesini akış akış verilebilir kılıyor:
kullanıcı ekranı bir kez açıp o akışın tüm maddelerini geçiyor.

## Doğrulama

**Kural: bir task yeşil olup commit'lenmeden sonraki başlamaz.** Commit
biriktirilmez, "sonra toplu test ederim" yok. Yığılma, bir regresyonun hangi
değişiklikten geldiğini belirsizleştiriyor.

**Her task için üç kapı:** davranışı çivileyen test → `tsc` + `eslint` (0 error)
→ tam test paketi yeşil.

**Ölçüm kapısı:** ilgili uç staging'den ölçülmeden kod yazılmaz. Ölçüm alanı
göstermiyorsa task plandan düşer ve "backend bekliyor"a taşınır.

**Test biçimi bulgu sınıfına göre:**

| Sınıf | Test | Gerekçe |
|---|---|---|
| Eksik alan | dolu → gösterir; 0 → göstermez; alan yok → çökmez | Üçüncüsü kritik: eski gövde şekli dolaşımda |
| Yanlış kural | saf fonksiyona birim test | Kural veriden bağımsız; ekran testi bugün geçerdi |
| Yanlış kapı | kapı yüklemine test | `apiStatusToUi` kaçırıldığında tip yakaladı, test kalıcı kılar |
| Metne bakan kod | **kaynak üzerinde** iddia | Davranış testi Türkçe koşuyor, iki hâlde de geçer |

**Elle doğrulama:** her akış bittiğinde o akışa özel adım listesi kullanıcıya
verilir (ne açılacak, ne görülmeli, ne görülmemeli). Cihazda tıklanamadığı için
bu maddeler ajan tarafından "yapıldı" işaretlenmez.

## Kapsam dışı

- **i18n göçü** duruyor. Aynı ekranın metnini ve davranışını aynı anda
  değiştirmek diff'i okunmaz yapıyor ve regresyonun kaynağını belirsizleştiriyor.
  Denetim bitince sürer.
- **Test flake'i:** tam turda iki kez farklı test 5 sn zaman aşımına düştü
  (`reset-password`, `category/slug`), tekrarında geçti. Ayrı bir iş; her turda
  gözlem rapora düşülür ki anekdot olmaktan çıksın.
- **Web'e özgü değişiklikler** (CSP, çerez onayı, düzen/responsive, Sentry): RN'de
  karşılığı yok.

## Başarı ölçütü

1. Faz 1 + Faz 2 tamamlandı; her bulgunun yanında ölçümü var.
2. Backend bekleyenler `PARITE_KALAN_ISLER.md`'de devredildi olarak yazılı.
3. Mobilde kapatılabilir her bulgu kapatıldı, her biri kendi commit'inde ve
   testinde.
4. Her akış için elle doğrulama listesi teslim edildi.
5. `tsc` temiz, `eslint` 0 error, tam test paketi yeşil.
