import { useCallback, useEffect, useRef } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/ui';
import { goBackOrHome } from '@/components/common/goBackOrHome';

/**
 * Form EKRANININ çıkış kuralı (modaldan ekrana taşınan formlar: iade, puanlama,
 * itiraz). Üç iş:
 *
 * 1. `dirty` iken her geri çıkış (üst bar oku, iOS kaydırma, Android geri tuşu)
 *    önce onay ister. `usePreventRemove` ŞART: native-stack'te iOS kaydırarak geri
 *    dönüş yalnız onunla engellenir; ham `beforeRemove` dinleyicisi JS/native yığını
 *    ayırır. Onaylanınca bekletilen eylem aynen gönderilir (React Navigation aynı
 *    eylemi bu ekran için ikinci kez durdurmaz).
 * 2. `leave()` başarılı gönderimden sonra onaysız bir adım geri çıkar (geçmiş yoksa
 *    ana sekme). Ekran o sırada artık açık DEĞİLSE (istek sürerken kullanıcı vazgeçip
 *    çıktıysa) hiçbir şey yapmaz — yoksa geç gelen başarı bir önceki ekranı da kapatırdı.
 * 3. `isOpen()` çok adımlı gönderimde (yükle → gönder) ara adımdan sonra ekranın
 *    hâlâ açık olup olmadığını söyler: kullanıcı vazgeçip çıktıysa ikinci adım atılmaz.
 *
 * Birleştirmede ortak `useUnsavedChangesGuard` (ui/d4b-forms1, usePreventRemove'a
 * geçiyor) hazır olunca 1. madde ona devredilebilir.
 */
export function useFormScreenExit(dirty: boolean) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const bypass = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  usePreventRemove(dirty, ({ data }) => {
    if (bypass.current) {
      navigation.dispatch(data.action);
      return;
    }
    void confirm({
      title: t('common.unsavedChanges'),
      message: t('common.unsavedChangesDescription'),
      confirmLabel: t('common.discardChanges'),
      cancelLabel: t('common.continueEditing'),
      destructive: true,
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action);
    });
  });

  const leave = useCallback(() => {
    if (!mounted.current) return;
    bypass.current = true;
    goBackOrHome();
  }, []);
  const isOpen = useCallback(() => mounted.current, []);

  return { leave, isOpen };
}
