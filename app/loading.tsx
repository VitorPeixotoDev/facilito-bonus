export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-900 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-3">
            <div className="h-9 w-56 rounded-lg bg-slate-800" />
            <div className="h-4 w-80 rounded bg-slate-800" />
          </div>
          <div className="h-20 w-56 rounded-2xl bg-slate-800" />
        </div>
        <div className="h-64 rounded-3xl bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 rounded-2xl bg-slate-800" />
          <div className="h-32 rounded-2xl bg-slate-800" />
          <div className="h-32 rounded-2xl bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
