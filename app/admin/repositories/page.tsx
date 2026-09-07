import Link from "next/link";
import { requireAdminPage } from "@/app/lib/auth/admin";
import { getRepositories } from "@/app/lib/services/repository.service";
import RepositoryManager from "@/app/components/admin/repository-manager";

export default async function AdminRepositoriesPage() {
  const { supabase } = await requireAdminPage();

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) {
    throw new Error("ACTIVE_EVENT_ID is not configured");
  }

  const repositories = await getRepositories(supabase, eventId);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <Link
        href="/admin"
        className="text-sm font-medium text-accent transition-opacity hover:opacity-80"
      >
        ← Back to admin
      </Link>

      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        Repositories
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Paste a GitHub URL and we&apos;ll pull its open issues with their labels.
        Re-import any time maintainers add more.
      </p>

      <hr className="my-8 border-zinc-800" />

      <RepositoryManager repositories={repositories} />
    </div>
  );
}
