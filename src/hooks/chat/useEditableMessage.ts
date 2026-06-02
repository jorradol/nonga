import { useState, useCallback, useEffect } from "react";

interface UseEditableMessageProps {
  initialText: string;
  onSave: (newText: string) => void | Promise<void>;
}

export function useEditableMessage({ initialText, onSave }: UseEditableMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialText);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(initialText);
    }
  }, [initialText, isEditing]);

  const startEditing = useCallback((currentText: string) => {
    setEditValue(currentText);
    setIsEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue(initialText);
  }, [initialText]);

  const saveEditing = useCallback(async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch {
      // Keep edit mode open when persistence fails.
    }
  }, [editValue, onSave]);

  return {
    isEditing,
    editValue,
    setEditValue,
    startEditing,
    cancelEditing,
    saveEditing,
  };
}
