import { Redirect } from 'expo-router';

// "Aboneliğim" ekranı "Üyelik Planı" ile birleşti: plan + abonelik durumu / yenileme / bitiş
// tek ekranda (`/membership`, mobilde salt görüntüleme). Eski yol (derin bağlantı, bildirim,
// eski sürüm kısayolları) oraya yönlenir.
export default function SubscriptionRedirect() {
  return <Redirect href="/membership" />;
}
