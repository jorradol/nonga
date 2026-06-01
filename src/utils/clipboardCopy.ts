/** Copy text to system clipboard with execCommand fallback. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const safeText = (text ?? "").trim();
  if (!safeText) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(safeText);
      return true;
    } catch {
      // fall through to legacy copy
    }
  }

  if (typeof document === "undefined") return false;

  const textArea = document.createElement("textarea");
  textArea.value = safeText;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.setAttribute("readonly", "true");
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textArea);
  return ok;
}
