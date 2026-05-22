import { useState, useEffect, useCallback } from "react";

export function useSpeech() {
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Clean markdown tags, emojis, and specific formats for pleasant narration
  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks entirely
      .replace(/`([^`]+)`/g, "$1") // Remove backticks but keep text
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold formatting
      .replace(/[-*#●•]/g, " ") // Remove bullet points or markdown list bullet tags
      .replace(/[\s\n]+/g, " ") // Compact spaces and newlines
      .trim();
  };

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  }, []);

  const speak = useCallback((text: string, messageId: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();

    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;

    const narratable =
      cleaned.length > 3000 ? `${cleaned.slice(0, 3000)}…` : cleaned;

    const utterance = new SpeechSynthesisUtterance(narratable);

    // Dynamic voice discovery (prefer gentle Thai voices)
    const voices = window.speechSynthesis.getVoices();
    const thVoice = voices.find((v) => v.lang.startsWith("th")) || voices.find((v) => v.lang.includes("TH"));
    if (thVoice) {
      utterance.voice = thVoice;
    }
    
    // Set natural speed and pitch for Nong A voice
    utterance.rate = 1.05; // Slightly lively
    utterance.pitch = 1.05; // Friendly high-tone

    utterance.onend = () => {
      setSpeakingMsgId(null);
    };

    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    setSpeakingMsgId(messageId);
    window.speechSynthesis.speak(utterance);
  }, []);

  const toggleSpeak = useCallback((text: string, messageId: string) => {
    if (speakingMsgId === messageId) {
      stop();
    } else {
      speak(text, messageId);
    }
  }, [speakingMsgId, speak, stop]);

  // Clean up speaking status when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    speakingMsgId,
    toggleSpeak,
    stop,
    isSpeaking: (messageId: string) => speakingMsgId === messageId,
  };
}
