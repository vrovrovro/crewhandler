export default function AppLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="mt-4 h-10 w-80 max-w-full rounded-2xl bg-slate-200" />
        <div className="mt-3 h-4 w-[32rem] max-w-full rounded-full bg-slate-100" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="h-3 w-24 rounded-full bg-slate-200" />
            <div className="mt-4 h-8 w-20 rounded-2xl bg-slate-200" />
            <div className="mt-3 h-3 w-32 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="rounded-[28px] border border-slate-200 bg-white p-5">
        <div className="h-5 w-40 rounded-full bg-slate-200" />
        <div className="mt-2 h-4 w-56 rounded-full bg-slate-100" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 rounded-2xl bg-slate-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
