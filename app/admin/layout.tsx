import Link from "next/link";
import { requireAdminPage } from "@/app/lib/auth/admin";
import LogoutButton from "@/app/components/auth/logout-button";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Gates every /admin/* route.
  await requireAdminPage();

  return (
    <div className="flex flex-1 flex-col bg-[#0e0f12] text-zinc-100">
      <header className="border-y border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/admin"
            className="bg-accent px-3 py-1 text-sm font-extrabold tracking-tight text-accent-foreground"
          >
            Admin
          </Link>
          <LogoutButton className="inline-flex h-9 items-center gap-2 border border-zinc-700 px-4 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900">
            <LogoutIcon />
            Log out
          </LogoutButton>
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
