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
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <Link
        href="/admin"
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Back to admin
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Repositories</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Import a GitHub repository by URL. Its open issues are pulled in
        automatically, with points and difficulty read from GitHub labels.
      </p>

      <RepositoryManager repositories={repositories} />
    </div>
  );
}
