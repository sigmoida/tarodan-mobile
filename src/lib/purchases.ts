import { appAlert } from '@/ui';

/**
 * Uygulama içi DİJİTAL satın alma (üyelik, boost) mümkün mü?
 *
 * Hiçbir platformda değil: kapı iki mağazada da kapalı.
 * - iOS: Apple, uygulama içinde özellik açan abonelikleri ve aynı uygulamada
 *   gösterilen tanıtımı (boost) yalnız kendi in-app purchase sistemiyle satmaya
 *   izin veriyor (App Store Review Guideline 3.1.1 ve 3.1.3(g)); web'e
 *   yönlendirmek de 3.1.3 anti-steering kapsamında yasak.
 * - Android: Google Play Payments politikası dijital ürün/abonelik için Play
 *   Billing'i zorunlu kılar ve kullanıcıyı uygulama dışı ödemeye yönlendirmeyi
 *   (steering) yasaklar.
 * Uygulamada IAP / Play Billing entegrasyonu YOK, bu yüzden her iki platformda
 * satış ve satışa çağıran (ya da web'den satın almaya yönlendiren) her yüzey
 * kapalı: bilgi gösterilir, satın alma yok, hata metni nötr, yönlendirme yok.
 *
 * FİZİKSEL ticaret bunun DIŞINDA: 3.1.3(e) fiziksel malın IAP ile satılmasını
 * yasaklıyor, yani sipariş/sepet/takas ödemesi PayTR'de kalmak ZORUNDA.
 *
 * Ekranlar `Platform`'a doğrudan bakmaz; kural buradan okunur. IAP/Play
 * Billing eklendiğinde ya da sunucu bayrağına taşındığında tek değişiklik
 * burada. `boolean` tipi bilinçli: `false` literal tipi, açık-satış dallarını
 * "erişilemez" diye işaretleyip tip denetimini bozar.
 */
export const CAN_BUY_DIGITAL = false as boolean;

/**
 * Limit uyarısı. Yükseltme düğmesi yalnız satın almanın mümkün olduğu
 * durumda eklenir; şimdilik (iOS + Android) uyarı yalnız durumu anlatır.
 */
export function limitAlert(opts: {
  title: string;
  message: string;
  cancelLabel: string;
  upgradeLabel: string;
  onUpgrade: () => void;
  onCancel?: () => void;
}): void {
  const buttons: Array<{ text: string; style?: 'cancel'; onPress?: () => void }> = [
    { text: opts.cancelLabel, style: 'cancel', onPress: opts.onCancel },
  ];
  if (CAN_BUY_DIGITAL) {
    buttons.push({ text: opts.upgradeLabel, onPress: opts.onUpgrade });
  }
  appAlert(opts.title, opts.message, buttons);
}
