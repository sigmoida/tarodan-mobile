import { PageShell } from '@/components/common/PageShell';

import { useMessageThread } from './_hooks/useMessageThread';
import { MessageThreadHeader } from './_components/MessageThreadHeader';
import { MessageList } from './_components/MessageList';
import { MessageInputBar } from './_components/MessageInputBar';

/**
 * Message thread — THIN screen. The `useMessageThread` controller owns the
 * messagesStore bindings, input/image/limit state, focus fetch + socket, and
 * the send/attach/block handlers; this file composes PageShell (klavye kaçınma,
 * güvenli alan, sabit alt bar) with header, list, and input.
 */
export default function MessageThreadScreen() {
  const f = useMessageThread();

  return (
    <PageShell
      mode="list"
      header={<MessageThreadHeader f={f} />}
      footer={<MessageInputBar f={f} />}
    >
      <MessageList f={f} />
    </PageShell>
  );
}
