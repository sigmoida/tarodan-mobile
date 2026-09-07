import { Platform } from 'react-native';
import { appAlert } from '@/ui';

/**
 * Uygulama içi DİJİTAL satın alma bu platformda mümkün mü?
 *
 * iOS'ta değil: Apple, uygulama içinde özellik açan abonelikleri ve aynı
 * uygulamada gösterilen tanıtımı (boost) yalnız kendi in-app purchase
 * sistemiyle satmaya izin veriyor (App Store Review Guideline 3.1.1 ve
 * 3.1.3(g)); web'e yönlendirmek de 3.1.3 anti-steering kapsamında yasak.
 * Uygulamada IAP entegrasyonu YOK, bu yüzden iOS'ta satış ve satışa çağıran
 * her yüzey kapalı.
 *
 * FİZİKSEL ticaret bunun DIŞINDA: 3.1.3(e) fiziksel malın IAP ile satılmasını
 * yasaklıyor, yani sipariş/sepet/takas ödemesi PayTR'de kalmak ZORUNDA.
 *
 * Ekranlar `Platform`'a doğrudan bakmaz; kural buradan okunur. Android'i de
 * kapatmak ya da sunucu bayrağına taşımak gerekirse tek değişiklik burada.
 */
export const CAN_BUY_DIGITAL = Platform.OS !== 'ios';

/**
 * Limit uyarısı. Yükseltme düğmesi yalnız satın almanın mümkün olduğu
 * platformlarda eklenir; iOS'ta uyarı yalnız durumu anlatır.
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
