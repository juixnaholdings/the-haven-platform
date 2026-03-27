interface StatCardProps {
  label: string;
  value: string | number;
  tone?: "default" | "accent";
}

export function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <article className={tone === "accent" ? "metric-card metric-card-accent" : "metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
