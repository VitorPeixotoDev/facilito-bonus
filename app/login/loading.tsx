export default function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md animate-pulse space-y-8 rounded-3xl border border-slate-700/50 bg-slate-800/60 p-8">
        <div className="space-y-3">
          <div className="mx-auto h-9 w-48 rounded-lg bg-slate-700" />
          <div className="mx-auto h-4 w-64 rounded bg-slate-700" />
        </div>
        <div className="h-12 rounded-xl bg-slate-700" />
      </div>
    </main>
  );
}
