export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 rounded-3xl bg-slate-800" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-32 rounded-2xl bg-slate-800" />
        <div className="h-32 rounded-2xl bg-slate-800" />
        <div className="h-32 rounded-2xl bg-slate-800" />
        <div className="h-32 rounded-2xl bg-slate-800" />
      </div>
    </div>
  );
}
