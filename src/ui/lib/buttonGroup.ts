import { createContext, useContext } from 'react';

/**
 * `ButtonRow` içindeki düğmeler kapsayıcıyı doldurur (`alignSelf: stretch`). Bayrak context:
 * düğmeye prop geçirmek / `cloneElement` gerekmez; ölçüm katmanı `false` verip düğmeleri
 * doğal (içerik) genişliğinde ölçer.
 */
const ButtonGroupContext = createContext(false);

export const ButtonGroupProvider = ButtonGroupContext.Provider;

export function useButtonGroup(): boolean {
  return useContext(ButtonGroupContext);
}
