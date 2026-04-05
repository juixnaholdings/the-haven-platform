import type { ReactNode } from "react";

interface ButtonLoadingContentProps {
  children: ReactNode;
  isLoading: boolean;
  loadingText: string;
}

export function ButtonLoadingContent({
  children,
  isLoading,
  loadingText,
}: ButtonLoadingContentProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span>{loadingText}</span>
      <span aria-hidden="true" className="button-inline-spinner" />
    </span>
  );
}
