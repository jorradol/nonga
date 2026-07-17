import { ChatMessage } from "../../types";
import { isUiFixtureBuild, UI_FIXTURE_DISABLED_REASON } from "../../fixture/uiFixtureMode";

export const aiService = {
  /**
   * Streams a chat response from the server-side Gemini Proxy.
   * Leverages browser ReadableStreams for responsive character-by-character typing.
   */
  async streamChat(
    message: string,
    history: ChatMessage[],
    meta: {
      presetId?: string;
      customInstructionOverrides?: any;
      sentiment?: string;
      convoCount?: number;
      userPreferences?: any;
    },
    onChunk: (text: string) => void,
    onComplete: () => void,
    onError: (err: Error) => void
  ): Promise<void> {
    if (isUiFixtureBuild) {
      onError(new Error(UI_FIXTURE_DISABLED_REASON));
      return;
    }
    try {
      const response = await fetch("/api/gemini/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          presetId: meta.presetId,
          customInstructionOverrides: meta.customInstructionOverrides,
          sentiment: meta.sentiment,
          convoCount: meta.convoCount,
          userPreferences: meta.userPreferences,
          // Extract relevant message sender roles and text to align with backend history expected format
          history: history.map((h) => ({
            role: h.sender,
            text: h.text
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("HTTP response body stream is inaccessible.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        // Decode binary chunk and compile with buffered stream data
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        // Retain any unfinished line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine.startsWith("data: ")) {
            const payload = cleanLine.substring(6).trim();

            if (payload === "[DONE]") {
              onComplete();
              return;
            }

            try {
              const data = JSON.parse(payload);
              if (data.error) {
                onError(new Error(data.error));
                return;
              }
              if (data.text) {
                onChunk(data.text);
              }
            } catch (e) {
              // Gracefully bypass incremental JSON segment anomalies
              console.debug("Buffered segment parsing debug:", e);
            }
          }
        }
      }

      // Finalize left-overs in buffer
      if (buffer.trim()) {
        const cleanLine = buffer.trim();
        if (cleanLine.startsWith("data: ")) {
          const payload = cleanLine.substring(6).trim();
          if (payload !== "[DONE]") {
            try {
              const data = JSON.parse(payload);
              if (data.text) onChunk(data.text);
            } catch {}
          }
        }
      }

      onComplete();
    } catch (err: any) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }
};
