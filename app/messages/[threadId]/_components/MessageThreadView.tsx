import { PageShell } from '@/components/common/PageShell';

import { useMessageThread } from '../_hooks/useMessageThread';
import { MessageThreadHeader } from './MessageThreadHeader';
import { MessageList } from './MessageList';
import { MessageInputBar } from './MessageInputBar';

/**
 * One conversation: PageShell (keyboard avoidance, safe areas, fixed input bar) with header, list
 * and input. Two hosts, one tree: the `/messages/[threadId]` route (full screen, the thread id from
 * the route) and the right-hand pane of the messages master–detail layout on wide windows
 * (`threadId` given, `embedded`: no back arrow, blocking closes the pane via `onExit`).
 */
export function MessageThreadView({
  threadId,
  embedded = false,
  onExit,
}: {
  threadId?: string;
  embedded?: boolean;
  onExit?: () => void;
}) {
  const f = useMessageThread({ threadId, onExit });
  return (
    <PageShell
      mode="list"
      header={<MessageThreadHeader f={f} showBack={!embedded} />}
      footer={<MessageInputBar f={f} />}
    >
      <MessageList f={f} />
    </PageShell>
  );
}
