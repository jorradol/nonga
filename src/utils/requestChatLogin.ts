import { useAppStore } from "../store";
import {
  setChatLoginReturnView,
  type ChatLoginReturnView,
} from "./chatLoginReturn";

/** Opens in-chat login modal when already on /chat; returns true if modal was opened. */
export function requestChatLoginModal(
  returnView: ChatLoginReturnView = "chat"
): boolean {
  setChatLoginReturnView(returnView);
  const { currentView, setChatLoginModalOpen } = useAppStore.getState();
  if (currentView === "chat") {
    setChatLoginModalOpen(true);
    return true;
  }
  return false;
}

/** Guest auth gate from chat: prefer modal, fallback to full login page. */
export function requireGuestLoginFromChat(
  returnView: ChatLoginReturnView = "chat"
): void {
  if (!requestChatLoginModal(returnView)) {
    useAppStore.getState().setView("login");
  }
}
