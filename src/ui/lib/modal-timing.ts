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
