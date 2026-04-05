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
      <div className="flex min-h-0 max-h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[#f8f4eb]/85 px-6 py-5">
          <div className="max-w-[72ch] space-y-1.5">
            <h3 className="m-0 text-xl font-semibold tracking-tight text-slate-900" id={headingId}>
              {title}
            </h3>
            {description ? <p className="m-0 text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          <button
            aria-label="Close form modal"
            className="button button-secondary button-compact"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 bg-[#f8f4eb]/75 px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </AppModal>
  );
}
