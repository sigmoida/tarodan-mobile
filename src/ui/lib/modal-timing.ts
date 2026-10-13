/**
 * Modal kapanışı zamanlaması — TEK kaynak. `AlertDialogHost` (alert -> alert) ve
 * `runAfterModalClose` (modal -> alert) aynı süreyi paylaşır; `ModalMessage` ile
 * `AlertDialog` birbirini import etmesin diye ayrı dosyada.
 */

/** Modal'ın kapanma animasyonunun bitmesi için beklenen süre (`onDismiss` yoksa yedek). */
export const MODAL_CLOSE_DELAY_MS = 400;

/**
 * iOS'ta `onDismiss` asıl sinyaldir; hiç gelmezse (ör. ağaçtan koparılan modal) akışın
 * sonsuza dek askıda kalmaması için üst sınır.
 */
export const MODAL_DISMISS_TIMEOUT_MS = 1500;

/**
 * iOS'ta bir modal sunumu UIKit tarafından sessizce reddedilirse (başka bir modal
 * kapanıyor/açılıyor) `onShow` hiç gelmez. Bu süre içinde gelmezse modal yeniden bağlanıp
 * tekrar sunulur (`FullScreenGate`'in `GATE_PRESENT_RETRY_MS`'i ile aynı değer).
 */
export const MODAL_PRESENT_RETRY_MS = 1500;
