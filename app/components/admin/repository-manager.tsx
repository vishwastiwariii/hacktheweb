"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { importRepositorySchema } from "@/app/lib/validation/repository";
import type { RepositorySummary } from "@/app/lib/services/repository.service";

type ImportResult = {
  repository: { name: string; full_name: string };
  totalFetched: number;
  importedIssues: number;
  validIssues: number;
  invalidMetadata: number;
};

export default function RepositoryManager({
  repositories,
}: {
  repositories: RepositorySummary[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busyRepoId, setBusyRepoId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(importRepositorySchema),
    defaultValues: { repositoryUrl: "" },
  });

  async function runImport(repositoryUrl: string) {
    setServerError(null);
    const res = await fetch("/api/admin/repositories/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repositoryUrl }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      setServerError(body?.error ?? "Import failed");
      return false;
    }
    setResult(body as ImportResult);
    router.refresh();
    return true;
  }

  const onSubmit = handleSubmit(async ({ repositoryUrl }) => {
    setResult(null);
    const ok = await runImport(repositoryUrl);
    if (ok) reset();
  });

  async function onReimport(repo: RepositorySummary) {
    setResult(null);
    setBusyRepoId(repo.id);
    await runImport(repo.html_url ?? `https://github.com/${repo.full_name}`);
    setBusyRepoId(null);
  }

  async function onRemove(repo: RepositorySummary) {
    setServerError(null);
    setBusyRepoId(repo.id);
    const res = await fetch(
      `/api/admin/repository?repositoryId=${encodeURIComponent(repo.id)}`,
      { method: "DELETE" },
    );
    setBusyRepoId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(body?.error ?? "Failed to remove repository");
      return;
    }
    setResult(null);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-6">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
      >
        <label
          htmlFor="repositoryUrl"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Import a GitHub repository
        </label>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Issues, points (<code>points:*</code>) and difficulty (
          <code>difficulty:*</code>) are read from GitHub labels.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="repositoryUrl"
            type="url"
            autoComplete="off"
            placeholder="https://github.com/owner/repo"
            className="h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none transition-colors focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
            {...register("repositoryUrl")}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 shrink-0 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Importing..." : "Import repository"}
          </button>
        </div>
        {errors.repositoryUrl && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {errors.repositoryUrl.message}
          </p>
        )}
        {serverError && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {serverError}
          </p>
        )}
        {result && (
          <div className="mt-3 rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-900">
            <p className="font-medium">
              Imported {result.repository.full_name}
            </p>
            <ul className="mt-1 text-zinc-600 dark:text-zinc-400">
              <li>Issues found: {result.totalFetched}</li>
              <li>Valid metadata: {result.validIssues}</li>
              <li>Need label fixes: {result.invalidMetadata}</li>
            </ul>
          </div>
        )}
      </form>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <h2 className="border-b border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Imported repositories ({repositories.length})
        </h2>
        {repositories.length === 0 ? (
          <p className="px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400">
            None yet. Import one above.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {repositories.map((repo) => (
              <li
                key={repo.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="min-w-0">
                  <a
                    href={repo.html_url ?? `https://github.com/${repo.full_name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {repo.full_name}
                  </a>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {repo.issue_count} issue{repo.issue_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onReimport(repo)}
                    disabled={busyRepoId === repo.id}
                    className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    {busyRepoId === repo.id ? "Working..." : "Re-import"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(repo)}
                    disabled={busyRepoId === repo.id}
                    className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-zinc-700 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
