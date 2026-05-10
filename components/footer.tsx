import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border-subtle py-12 mt-24">
      <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-screen-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <Link
          href="/"
          className="text-lg font-display font-medium tracking-[0.2em] uppercase text-text-primary"
        >
          Tessera
        </Link>
        <p className="text-caption text-text-muted">
          Built with Umbra · Powered by Solana · Open source
        </p>
      </div>
    </footer>
  );
}
