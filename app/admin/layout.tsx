import Link from "next/link";
import { requireAdminPage } from "@/app/lib/auth/admin";
import LogoutButton from "@/app/components/auth/logout-button";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Gates every /admin/* route.
  await requireAdminPage();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="text-sm font-semibold">
            Admin
          </Link>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
