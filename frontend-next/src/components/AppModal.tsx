"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

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
  const shellSizeClassName =
    size === "small"
      ? "max-w-xl"
      : size === "large"
        ? "max-w-5xl"
        : "max-w-3xl";

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

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain" role="presentation">
      <button
        aria-label="Close modal"
        className="fixed inset-0 border-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <div className="relative flex min-h-full items-start justify-center p-4 sm:p-5">
        <div
          aria-labelledby={labelledBy}
          aria-modal="true"
          className={`relative my-3 flex w-full max-h-[calc(100dvh-2rem)] min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-[#fffdfa] shadow-[0_28px_68px_rgba(15,23,42,0.24)] sm:my-5 sm:max-h-[calc(100dvh-2.5rem)] ${shellSizeClassName}`}
          role="dialog"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
