import { forwardRef, type TextareaHTMLAttributes } from "react";
import { useChatComposerIsMobile } from "../../hooks/chat/useChatComposerIsMobile";
import {
  CHAT_COMPOSER_TEXTAREA_DESKTOP_PROPS,
  CHAT_COMPOSER_TEXTAREA_MOBILE_PROPS,
} from "./chatComposerTextareaConfig";

export type ChatComposerTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Platform-specific textarea: minimal on mobile for OEM keyboard voice typing.
 */
export const ChatComposerTextarea = forwardRef<
  HTMLTextAreaElement,
  ChatComposerTextareaProps
>(function ChatComposerTextarea({ ...rest }, ref) {
  const isMobile = useChatComposerIsMobile();
  const platformProps = isMobile
    ? CHAT_COMPOSER_TEXTAREA_MOBILE_PROPS
    : CHAT_COMPOSER_TEXTAREA_DESKTOP_PROPS;

  return <textarea ref={ref} {...platformProps} {...rest} />;
});
