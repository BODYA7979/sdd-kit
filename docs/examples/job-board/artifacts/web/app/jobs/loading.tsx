export default function JobsLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10" aria-busy="true">
      <span className="sr-only">Loading jobs…</span>
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    </main>
  );
}
