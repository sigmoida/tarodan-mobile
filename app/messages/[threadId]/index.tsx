import { MessageThreadView } from './_components/MessageThreadView';

/**
 * Message thread — THIN screen. The `useMessageThread` controller owns the
 * messagesStore bindings, input/image/limit state, focus fetch + socket, and
 * the send/attach/block handlers; `MessageThreadView` composes PageShell with
 * header, list, and input (the same tree as the wide-window master–detail pane).
 */
export default function MessageThreadScreen() {
  return <MessageThreadView />;
}
