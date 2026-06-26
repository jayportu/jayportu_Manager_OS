/**
 * Loading del portal booker (l24). Skeleton mientras cargan las queries
 * server-side (requests, seguidos, pitches, etc.) — antes no había feedback.
 */
export default function BookerLoading() {
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto animate-pulse">
      <div className="border-2 border-border/20 bg-bg-panel p-6 md:p-7 mb-6">
        <div className="h-3 w-32 bg-ink/10 mb-3" />
        <div className="h-12 w-48 bg-ink/10" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-2 border-border/20 bg-bg-panel p-5">
            <div className="h-4 w-1/3 bg-ink/10 mb-2" />
            <div className="h-3 w-2/3 bg-ink/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
