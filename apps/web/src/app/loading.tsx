export default function RootLoading() {
  return (
    <div className="grid min-h-[40vh] place-items-center p-6" role="status" aria-live="polite" aria-label="טוען">
      <div className="h-2.5 w-[min(280px,70vw)] animate-pulse rounded-full bg-gradient-to-l from-brand/15 via-brand/45 to-brand/15" />
    </div>
  );
}
