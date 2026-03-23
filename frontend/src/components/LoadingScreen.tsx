interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="centered-state">
      <div className="loading-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
