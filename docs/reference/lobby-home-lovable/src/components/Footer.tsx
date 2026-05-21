export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/60 bg-white/50 backdrop-blur">
      <div className="mx-auto max-w-[1400px] px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-graphite/70">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand shadow-puffy grid place-items-center text-white font-black text-xs">L</div>
          <span className="font-bold text-graphite">LOBBY</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6">
          <a className="hover:text-brand" href="#">תנאי שימוש</a>
          <a className="hover:text-brand" href="#">פרטיות</a>
          <a className="hover:text-brand" href="#">צור קשר</a>
        </div>
      </div>
    </footer>
  );
}