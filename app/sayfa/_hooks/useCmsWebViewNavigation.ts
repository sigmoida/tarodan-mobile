import { Linking } from 'react-native';
import { router, type Href } from 'expo-router';
import { decideCmsNavigation } from '../_lib/navigation';

/**
 * CMS WebView'inin gezinme kancası. Karar saf (`_lib/navigation`); burada yalnız
 * yan etki: uygulama içi rota ya da sistem tarayıcısı.
 */
export function useCmsWebViewNavigation() {
  const onShouldStartLoadWithRequest = (request: { url: string; isTopFrame?: boolean }) => {
    const decision = decideCmsNavigation(request.url, request.isTopFrame);
    if (decision.action === 'app') router.push(decision.route as Href);
    else if (decision.action === 'external') void Linking.openURL(decision.url).catch(() => {});
    return decision.action === 'allow';
  };
  return { onShouldStartLoadWithRequest };
}
