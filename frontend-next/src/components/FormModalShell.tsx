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
      <div className="form-modal-shell">
        <header className="form-modal-header">
          <div className="form-modal-copy">
            <h3 id={headingId}>{title}</h3>
            {description ? <p className="muted-text">{description}</p> : null}
          </div>
          <button
            aria-label="Close form modal"
            className="button button-ghost button-compact form-modal-close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>
        <div className="form-modal-body">{children}</div>
        {footer ? <footer className="form-modal-footer">{footer}</footer> : null}
      </div>
    </AppModal>
  );
}
