export default function ListingLoading() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-5" role="status" aria-label="טוען מודעה">
          <div className="min-h-[280px] w-full animate-pulse rounded-[24px] bg-soft" />
          <div className="grid gap-3">
            <span className="block h-4 animate-pulse rounded-[10px] bg-soft" />
            <span className="block h-4 animate-pulse rounded-[10px] bg-soft" />
            <span className="block h-4 w-[55%] animate-pulse rounded-[10px] bg-soft" />
          </div>
        </div>
      </div>
    </main>
  );
}
