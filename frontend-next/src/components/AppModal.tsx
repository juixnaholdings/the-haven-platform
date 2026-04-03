"use client";

import { useEffect } from "react";

interface AppModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  labelledBy?: string;
  size?: "small" | "medium" | "large";
}

export function AppModal({
  children,
  isOpen,
  onClose,
  labelledBy,
  size = "medium",
}: AppModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="app-modal-root" role="presentation">
      <button
        aria-label="Close modal"
        className="app-modal-backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`app-modal-shell app-modal-shell-${size}`}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
