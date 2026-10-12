import { useState } from 'react';
import { newRotationSeed } from './pickAd';

/**
 * Bir ekranın reklam yuvalarının ortak oturumu: tek rotasyon tohumu (yuvalar
 * aynı "sayfa yüklemesi"ni paylaşır, web ile aynı) ve gösterimi sayılmış
 * reklamların kümesi. Liste içi yuvalar kaydırmayla yeniden bağlansa da aynı
 * reklamı seçer ve aynı gösterimi ikinci kez saymaz.
 */
export interface AdSession {
  seed: number;
  /** Gösterimi bu oturumda gönderilmiş reklam kimlikleri. */
  sentImpressions: Set<string>;
}

export function useAdSession(): AdSession {
  const [session] = useState<AdSession>(() => ({
    seed: newRotationSeed(),
    sentImpressions: new Set<string>(),
  }));
  return session;
}
