import Link from "next/link";

import { Badge } from "@/components/ui/badge";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/vault", label: "Vault" },
  { href: "/strategies", label: "Strategies" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
  return (
    <header className="bg-grid border-b border-border/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">MetaYield</p>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">USDC Blended Vault</h1>
            <Badge variant="accent">Base</Badge>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-text">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="text-xs text-muted md:hidden">Menu in progress</div>
      </div>
    </header>
  );
}
