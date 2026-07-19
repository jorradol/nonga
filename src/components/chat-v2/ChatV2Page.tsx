/**
 * Chat Experience V2 — route entry for /chat-v2 (Phase V2-1).
 *
 * Isolated presentation shell over the EXISTING chat brain:
 * - mounts the same ChatProvider (submission path, history, carCards
 *   contracts unchanged)
 * - never imports providers/orchestrators/prompts
 * - /chat and its D1 experience remain untouched; this page is reachable
 *   only by direct URL (no navigation cutover in this phase)
 */
import { ChatProvider } from "../../contexts/chat/ChatContext";
import { ChatLoginModal } from "../chat/ChatLoginModal";
import { useAppStore } from "../../store";
import { ChatV2Shell } from "./ChatV2Shell";

export default function ChatV2Page() {
  const chatLoginModalOpen = useAppStore((s) => s.chatLoginModalOpen);
  const setChatLoginModalOpen = useAppStore((s) => s.setChatLoginModalOpen);

  return (
    <ChatProvider>
      <ChatV2Shell />
      <ChatLoginModal
        open={chatLoginModalOpen}
        onClose={() => setChatLoginModalOpen(false)}
      />
    </ChatProvider>
  );
}
