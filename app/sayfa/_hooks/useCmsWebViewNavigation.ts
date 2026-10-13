import { useCallback, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import { router, type Href } from 'expo-router';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { decideCmsNavigation, isUserInitiated } from '../_lib/navigation';

/**
 * CMS WebView'inin gezinme kancaları. Karar saf fonksiyonlarda
 * (`_lib/navigation`); burada yalnız yan etki: uygulama içi rota ya da sistem
 * tarayıcısı. Dış açılış YALNIZ kullanıcı dokunuşuyla olur — script, meta-refresh
 * ve iframe kaynaklı yönlendirmeler sessizce düşer.
 */
export function useCmsWebViewNavigation(platform: string = Platform.OS) {
  // İlk HTML yüklemesi bitti mi? Android'de dokunuşu ayırt edemediğimiz için
  // "yükleme bittikten sonraki ana çerçeve gezinmesi" kuralı bununla işler.
  const initialLoadDone = useRef(false);

  const onLoadEnd = useCallback(() => {
    initialLoadDone.current = true;
  }, []);

  const onShouldStartLoadWithRequest = useCallback(
    (request: Pick<ShouldStartLoadRequest, 'url'> & Partial<ShouldStartLoadRequest>) => {
      const decision = decideCmsNavigation(request.url, request.isTopFrame);
      if (decision.action === 'allow') return true;
      if (decision.action === 'block') return false;

      const userInitiated = isUserInitiated({
        platform,
        navigationType: request.navigationType,
        isTopFrame: request.isTopFrame,
        initialLoadDone: initialLoadDone.current,
      });
      if (!userInitiated) return false;

      if (decision.action === 'app') router.push(decision.route as Href);
      else void Linking.openURL(decision.url).catch(() => undefined);
      return false;
    },
    [platform],
  );

  return { onShouldStartLoadWithRequest, onLoadEnd };
}
