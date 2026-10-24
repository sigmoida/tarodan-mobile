import { useWindowDimensions } from 'react-native';
import { windowClassOf } from '@/ui';

/**
 * Messages layout by window width. Phones and medium windows: the inbox is a list and a thread is
 * pushed as its own screen (unchanged). Expanded and wider windows: master–detail, the thread list
 * on the left (`MASTER_PANE_FRACTION`) and the open conversation on the right, inside the
 * messages route. Deep links and push notifications open `/messages/[threadId]` on every width.
 */
export const MASTER_PANE_FRACTION = 0.35;

export function isMessagesMasterDetail(windowWidth: number): boolean {
  const cls = windowClassOf(windowWidth);
  return cls === 'expanded' || cls === 'large';
}

export function useMessagesMasterDetail(): boolean {
  return isMessagesMasterDetail(useWindowDimensions().width);
}
