export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "coral";
}) {
  const toneClasses =
    tone === "accent"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : tone === "coral"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-white text-brand-ink";

  return (
    <div className={`rounded-[24px] border p-5 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-2 text-sm opacity-70">{hint}</p> : null}
    </div>
  );
}
