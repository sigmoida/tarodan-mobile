import { createPlatformQueryClient } from "@/lib/api-client/query";
import { installOnlineManager } from "@/lib/network/onlineManager";
import { installFocusManager } from "./focusManager";

// TanStack `onlineManager` cihaz bağlantısına bağlanır (ilk sorgudan önce): çevrimiçi olunca
// eskimiş / hatalı sorgular tazelenir.
installOnlineManager();
// `focusManager` AppState'e bağlanır: arka planda yoklamalar durur, ön plana dönüşte eskimiş
// ekran sorguları tazelenir (`./focusManager`).
installFocusManager();

// Tek paylaşılan QueryClient — _layout'taki provider ve logout temizliği
// (resetUserStores) aynı örneği kullansın diye modül seviyesinde.
export const queryClient = createPlatformQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      // 'always': çevrimdışıyken sorgular DURAKLATILMAZ (varsayılan 'online' duraklatır: ekran
      // yükleme/hata durumuna hiç girmeden boş kalır). Davranış bağlantı izlemesinden ÖNCEKİYLE
      // aynı kalır — istek denenir, ağ hatasıyla düşerse mevcut hata durumu görünür; yeniden
      // bağlanınca `refetchOnReconnect` (onlineManager) yine tazeler.
      networkMode: 'always',
      // Ön plana GERÇEK dönüşte (arka plan → active; iOS `inactive` sıçraması sayılmaz) yalnız
      // ekranda olan VE eskimiş (staleTime 5 dk) sorgular yenilenir — her dönüşte her şey değil.
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Yazmalar (ödeme, teklif…) çevrimdışıyken sessizce kuyruğa alınıp bağlantı dönünce
      // KENDİLİĞİNDEN çalışmasın; kullanıcı hatayı görür ve bilerek yeniden dener.
      networkMode: 'always',
    },
  },
});
