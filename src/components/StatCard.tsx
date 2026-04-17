type StatCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-line)] bg-white/80 p-4 shadow-[var(--shadow-panel)] backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--color-ink)]">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

