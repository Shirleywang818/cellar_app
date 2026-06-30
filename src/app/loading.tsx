export default function Loading() {
  return (
    <main className="shell">
      <div className="grid gap-3">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-24 animate-pulse rounded-md bg-muted" />
        <div className="h-24 animate-pulse rounded-md bg-muted" />
      </div>
    </main>
  );
}
