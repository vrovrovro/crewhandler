export function LoadingGrid() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="panel h-28 animate-pulse bg-white/60" />
        ))}
      </div>
      <div className="panel h-80 animate-pulse bg-white/60" />
    </div>
  );
}
