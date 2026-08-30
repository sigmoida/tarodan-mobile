# İlan Formu Sözleşmesi Turu — Kapanış

**Tarih:** 2026-08-10
**Branch:** `feat/ilan-formu-sozlesmesi` (13 commit, `eb1ef7c` üzerinden)
**Spec:** `docs/superpowers/specs/2026-08-10-ilan-formu-sozlesmesi-design.md`
**Plan:** `docs/superpowers/plans/2026-08-10-ilan-formu-sozlesmesi.md`
**Ölçüm:** `docs/superpowers/reports/2026-08-10-products-my-olcum.md`

## Ne kapandı

İlan düzenleme formu bugüne kadar ürünün **gösterim** projeksiyonundan
dolduruluyordu; sunucu ise kayda **geri yazılabilir** ham değerleri ayrı bir
`edit` bloğunda veriyor. Fark, satıcının dokunmadığı alanların sessizce
değişmesine yol açıyordu.

### 1. Prefill tek kaynağa indi

Yeni saf eşleyici `_lib/editMapper.ts` — `edit` yanıtını form değerlerine
çeviriyor. Prefill 868 satırlık hook'un içindeki ~120 satırlık bir
`useEffect` bloğuydu; artık render olmadan test edilebiliyor.

Sözleşme net: **kayda geri yazılan her alan `edit`'ten gelir.** İki istisna,
çünkü `edit` onları taşımıyor (ölçüldü): `isPreorder` ve rezerve adet
(`quantity − availableQuantity`).

### 2. `_lib/payload.ts` silindi

20 satırlık `buildTierPayloadField` workaround'u, "sunucu kargo paket kademesini
geri döndürmüyor" varsayımı üzerine kuruluydu. Ölçüm bu varsayımı çürüttü
(`edit.shippingPackageTier: "small"`). Kademe artık **koşulsuz** gönderiliyor;
`validate.ts`'teki "düzenlemede zorunlu değil" istisnası da gerekçesini
kaybettiği için kalktı.

### 3. Görsel sözleşmesi

- Yükleme yanıtında key eksikse görsel kabul edilmiyor; yerel geçici URI
  saklanmıyor.
- Prefill'de URL'den key türetme (`cardKey ?? i.url`) kalktı — key'i eksik
  görsel atlanıyor, uydurulmuyor.
- **Kaydet butonu artık yükleme kuyruğuna bağlı** — eskiden yalnız görsel
  seçiciyi kapatıyordu, satıcı yükleme sürerken kaydedip yarım `images[]`
  gönderebiliyordu.
- `409` iyimser kilit çakışmasında form kaydedilmiş sayılmıyor: taze kayıt
  çekiliyor, çakışma bildiriliyor, başarı akışına düşülmüyor.

### 4. `modelCode` forma eklendi

Sunucu bu alanı tutuyor ve `edit`'te geri veriyordu; form hiç taşımadığı için
her düzenlemede sessizce kayboluyordu. Boş string gönderilebiliyor, yani satıcı
alanı temizleyebiliyor.

### 5. İndirim payload'ı ortaklaştı

`buildSalePayload()` tek yardımcı; create ve update aynı payload'ı üretiyor.
Mevcut `hasSale` koşulu birebir korundu. Etkin fiyat istemcide türetilmiyor.

## Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `npx tsc --noEmit` | 0 hata |
| `npx jest --forceExit` | 178 suite / **1429** test PASS (tur başında 1415) |
| `npx eslint app src` | 0 error (996 warning, hepsi önceden var olan `no-explicit-any`) |
| `grep buildTierPayloadField\|_lib/payload` | boş |
| `grep "manufacturerSlug &&"` | boş |

**Metro'da elle denenmedi.** Merge öncesi asıl test — turun varlık sebebi:
mevcut bir ilanı düzenle, **yalnız başlığı** değiştir, kaydet, ilanı yeniden aç
ve şunların değişmediğini doğrula: kargo paket kademesi, indirimli/normal fiyat,
görseller ve sıraları, model kodu, nitelikler (ölçek dahil). Ayrıca yeni ilan
oluştururken görsel yüklenirken kaydet butonunun kapalı olduğunu gör.

## Kapı: `relatedOrder` / `relatedTrade` düştü

`GET /products/my` bu alanları yayınlamıyor. Bu **"örnek veri yok" değil**:
hesapta 1 `sold` ve 2 `reserved` ilan var, alan yine gelmiyor. Kod yazsaydık
ölü bir dal eklemiş olacaktık.

→ `docs/PARITE_KALAN_ISLER.md` P2 #8 **backend bekliyor** olarak işaretlendi.
Backend'e sorulacak: alan role/filtreye mi bağlı, yoksa henüz deploy edilmedi mi?

## Planın hataları (süreç yakaladı)

Bu tur, planın kendi metnindeki üç kusuru ortaya çıkardı — üçü de ölçüm veya
inceleme sayesinde:

**1. `values.scale` nitelik slug'ıyla dolduruluyordu (Critical).** Plan
`scale: attrs.scale?.[0]` yazmıştı; `attrs` slug tutuyor (`'1-64'`) ama form ve
payload görünen değeri bekliyor (`'1:64'`). Satıcı yalnız başlıktaki bir yazım
hatasını düzeltip kaydetseydi ölçek çipi boş görünecek ve payload'a tanınmayan
bir değer gidecekti.

Kök nedeni bulmak için ek ölçüm yapıldı ve ölçek ile malzemenin **farklı**
alanlardan okunması gerektiği kesinleşti:

| Nitelik | `slug` | `value` | `displayValue` | Formun beklediği |
| --- | --- | --- | --- | --- |
| `scale` | `1-64` | `1:64` | `1:64` | **`value`** |
| `material` | `diecast` | `diecast` | `Diecast Metal` | **`slug`** |

**2. Üretici-bağımsız nitelikler `attributes[]` payload'ına sızıyordu
(Critical).** Plan `initialCustomAttrsRef.current = mapped.attrs` diyordu; tur
öncesi kodda bir `manufacturerSlug` filtresi vardı ve prefill taşınırken düştü.
Satıcı ölçeği **bilerek** değiştirse bile eski slug geri yazılıyordu.

Kök neden ikisinde de aynı: `attrs` nesnesinin hem form değeri hem payload
kaynağı olarak iki efendiye hizmet etmesi. Düzeltme kaynağında ayırdı
(`attrs` form için, `manufacturerAttrs` payload için).

**3. Plan, spec'in iki test gereksinimini taşımamıştı.** Görev 5'in brief'i
"test dosyası genişlemez" diyordu ama spec "yükleme sürerken kaydet kapalı" ve
"409'da form kaydedilmiş sayılmıyor" testlerini açıkça istiyordu. Spec üstün
sayıldı, ikisi de eklendi.

Ayrıca düzeltme dalgasının kendisi bir gerileme getirdi ve o da yakalanıp
kapatıldı: `409` sonrası `initialCustomAttrsRef` temizlenmiyordu, bu da
"görünmez payload kirlenmesi" sınıfını dar bir kapıdan geri getiriyordu.

## Kalan iş — insan ortağının kararını bekliyor

**Oluşturma ekranında indirim girdisi UI'ı yok.** Boru hattı hazır ve testli,
ama indirim kutusu yalnız düzenleme modunda render ediliyor
(`ListingSections.tsx`'te bir `isEdit` kapısı). Yani satıcı yeni bir ilanı
**doğrudan** indirimli açamıyor; oluşturup sonra düzenlemeden ekliyor.

Spec §4 yalnız payload mantığını istiyordu ve plan da onu yaptı — ama spec'in
başlığı ("Yeni ilan indirimli açılabilir") kullanıcıya erişilebilir olmayı ima
ediyor. Merge'ü engellemiyor; ayrı bir tur işi. **Bunu "bitti" saymamak önemli**,
yoksa özellik aylarca erişilemez kalır.

→ `docs/PARITE_KALAN_ISLER.md`'ye P2 olarak eklendi.

## Ertelenenler

| Konu | Neden ertelendi |
| --- | --- |
| `resolveUpload` testte `act()` dışında çağrılıyor | RNTL'de meşru kalıp; assertion'ları zayıflatmıyor. Kök neden araştırması ayrı iş |
| `labelFallback` liste yüklendi ama id listede yoksa boş gösteriyor | Yalnız görüntü — `selected*` payload'a girmiyor, veri kaybı yok. Tur öncesi davranış |
| `create` her POST'ta indirim alanlarını `null` gönderiyor | Sunucu `null` ile "alan yok"u ayırt ediyorsa yeni bir yazma. Ölçülmedi |
| `resetForm()` kademe/indirim/`bundleSize`/`status` temizlemiyor | Tur regresyonu değil, ama kademe artık zorunlu olduğu için daha görünür |
