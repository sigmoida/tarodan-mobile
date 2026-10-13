import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { newRotationSeed } from './pickAd';

/**
 * Bir ekranın reklam yuvalarının ortak oturumu: tek rotasyon tohumu (yuvalar
 * aynı "sayfa yüklemesi"ni paylaşır, web ile aynı) ve gösterimi sayılmış
 * yuva+reklam çiftlerinin kümesi. Liste içi yuvalar kaydırmayla yeniden bağlansa
 * da aynı reklamı seçer ve aynı gösterimi ikinci kez saymaz.
 */
export interface AdSession {
  /** Rotasyon tohumu; oturum yenilenince değişir (yuvalar buna bakıp yeniden seçer). */
  seed: number;
  /** Gösterimi bu oturumda gönderilmiş yuva+reklam çiftleri (`impressionKey`). */
  sentImpressions: Set<string>;
}

const createSession = (): AdSession => ({
  seed: newRotationSeed(),
  sentImpressions: new Set<string>(),
});

/**
 * Web'deki "sayfa yüklemesi" karşılığı: ekran açılınca oturum başlar ve ekran
 * yeniden odaklanınca (başka sekmeden/ekrandan dönüş) YENİDEN başlar — yeni
 * tohum (yuvalar yeniden seçilir) + boş gösterim kümesi (yeni seçim yeni
 * gösterim sayılır). Sekme ekranları (ana sayfa) unmount olmadığından oturum
 * aksi halde uygulama kapanana dek sıfırlanmazdı. İlk odak oturumu BAŞLATMAZ.
 */
export function useAdSession(): AdSession {
  const [session, setSession] = useState<AdSession>(createSession);
  const wasBlurred = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (wasBlurred.current) {
        wasBlurred.current = false;
        setSession(createSession());
      }
      return () => {
        wasBlurred.current = true;
      };
    }, []),
  );

  return session;
}
