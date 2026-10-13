import { useCallback, useRef } from 'react';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/ui';

/**
 * Çok alanlı form EKRANLARI için taslak kaybı koruması (web `useFormModalLabels`
 * ile aynı metinler: `common.unsavedChanges` …). Form kirliyken ekrandan her
 * çıkış — üst bardaki geri oku, iOS kaydırma, Android donanım geri tuşu — önce
 * onay ister. Tek kanca `beforeRemove`: hepsi aynı navigasyon olayından geçer.
 *
 * Dinleyici yalnız ekran ODAKTAYKEN bağlı (`useFocusEffect`): üstüne başka
 * ekran (ör. ürün seçici) itilince çözülür, geri dönünce yeniden bağlanır.
 *
 * Başarılı kayıttan sonra form hâlâ "kirli" görünür; `allowLeave()` korumayı
 * kapatır, ardından `router.back()` onaysız çalışır.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const bypassRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (!dirtyRef.current || bypassRef.current) return;
        e.preventDefault();
        // `confirm()` kapanış SONRASI çözülür (AlertDialog sözleşmesi) → dispatch iOS-güvenli.
        void confirm({
          title: t('common.unsavedChanges'),
          message: t('common.unsavedChangesDescription'),
          confirmLabel: t('common.discardChanges'),
          cancelLabel: t('common.continueEditing'),
          destructive: true,
        }).then((discard) => {
          if (!discard) return;
          bypassRef.current = true;
          navigation.dispatch(e.data.action);
        });
      });
      return unsubscribe;
    }, [navigation, t]),
  );

  const allowLeave = useCallback(() => {
    bypassRef.current = true;
  }, []);

  return { allowLeave };
}
