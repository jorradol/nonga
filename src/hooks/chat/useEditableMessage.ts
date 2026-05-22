import { useState, useCallback } from "react";

interface UseEditableMessageProps {
  initialText: string;
  onSave: (newText: string) => void | Promise<void>;
}

export function useEditableMessage({ initialText, onSave }: UseEditableMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialText);

  const startEditing = useCallback((currentText: string) => {
    setEditValue(currentText);
    setIsEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const saveEditing = useCallback(async () => {
    if (!editValue.trim()) return;
    await onSave(editValue.trim());
    setIsEditing(false);
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
