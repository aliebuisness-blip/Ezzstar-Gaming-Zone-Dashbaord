type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Preparing your arena..." }: LoadingStateProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.052] p-5 shadow-nebula">
      <div className="space-y-3">
        <div className="h-3 w-36 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-64 max-w-full animate-pulse rounded-full bg-white/10" />
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div className="h-20 animate-pulse rounded-2xl bg-white/[0.055]" key={item} />
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
    </div>
  );
}
