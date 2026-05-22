import { useState, useCallback } from "react";

export function useClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, id: string) => {
    const safeText = (text ?? "").trim();
    if (!safeText) return;

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      // Fallback copy mechanism
      const textArea = document.createElement("textarea");
      textArea.value = safeText;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
      } catch (err) {
        console.error("Fallback copy failed", err);
      }
      document.body.removeChild(textArea);
      return;
    }

    navigator.clipboard
      .writeText(safeText)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
      })
      .catch((err) => {
        console.error("Clipboard copy failed", err);
      });
  }, []);

  return {
    copiedId,
    copyToClipboard,
    isCopied: (id: string) => copiedId === id,
  };
}
