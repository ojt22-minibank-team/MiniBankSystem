function PublicAuthFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/80">
      <div className="mx-auto flex min-h-11 max-w-[1280px] flex-col items-center justify-center gap-1 px-5 py-2 text-center text-[11px] text-slate-400 sm:flex-row sm:justify-between md:px-8">
        <p>© 2026 ACE Bank. All rights reserved.</p>
        <p>
          Secure{" "}
          <span aria-hidden="true" className="px-1.5 text-cyan-500">
            •
          </span>{" "}
          Simple{" "}
          <span aria-hidden="true" className="px-1.5 text-cyan-500">
            •
          </span>{" "}
          Convenient
        </p>
      </div>
    </footer>
  );
}
export default PublicAuthFooter;
