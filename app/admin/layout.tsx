import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/app/lib/auth/admin";
import LogoutButton from "@/app/components/auth/logout-button";

export const metadata: Metadata = { title: "Admin" };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/repositories", label: "Targets" },
  { href: "/admin/issues", label: "Issues" },
  { href: "/admin/contributions", label: "Review" },
];

const NAV_LINK =
  "font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-accent";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Gates every /admin/* route.
  await requireAdminPage();

  return (
    <div className="flex flex-1 flex-col bg-background text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
          <Link
            href="/admin"
            className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.25em] text-white"
          >
            <span className="inline-block h-1.5 w-1.5 bg-accent" aria-hidden />
            Hack The Web
            <span className="bg-accent px-2 py-0.5 text-[10px] tracking-[0.2em] text-accent-foreground">
              Admin
            </span>
          </Link>

          <nav aria-label="Admin" className="order-3 flex w-full gap-6 sm:order-none sm:w-auto">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={NAV_LINK}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className={NAV_LINK}>
              Student view
            </Link>
            <LogoutButton className="inline-flex h-9 items-center gap-2 border border-zinc-700 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-100 transition-colors hover:border-accent hover:text-accent">
              <LogoutIcon />
              Log out
            </LogoutButton>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
