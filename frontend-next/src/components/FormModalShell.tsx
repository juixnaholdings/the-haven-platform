"use client";

import { useId } from "react";

import { AppModal } from "./AppModal";

interface FormModalShellProps {
  children: React.ReactNode;
  description?: string;
  footer?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: "small" | "medium" | "large";
  title: string;
}

export function FormModalShell({
  children,
  description,
  footer,
  isOpen,
  onClose,
  size = "large",
  title,
}: FormModalShellProps) {
  const headingId = useId();

  return (
    <AppModal isOpen={isOpen} labelledBy={headingId} onClose={onClose} size={size}>
      <div className="grid max-h-[calc(100vh-2.5rem)] grid-rows-[auto,minmax(0,1fr),auto]">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-[#f8f4eb]/80 px-5 py-4">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900" id={headingId}>
              {title}
            </h3>
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </div>
          <button
            aria-label="Close form modal"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>
        <div className="overflow-auto px-5 py-5">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-[#f8f4eb]/60 px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </AppModal>
  );
}
