import Image from "next/image";

interface StatCardProps {
  label: string;
  value: string | number;
  info?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, info, icon = "default" }: StatCardProps) {
  return (
    <article className="metric-card h-full border-zinc-400">
      <div className="flex-1 gap-10 justify-between">
        <div className="flex justify-between gap-2.5 ml-1.5 m-0">
          <div className="flex-1 items-start w-1/3">
            {icon}
          </div>
          <div className="flex-1 items-end w-1/3">
            {info}
          </div>
        </div>
        <div className="flex-col m-5 ml-1.5">

      <span>{label}</span>
        </div>
        <div className="flex-col m-5 ml-1.5">

      <strong>{value}</strong>
        </div>
      </div>
    </article>
  );
}
