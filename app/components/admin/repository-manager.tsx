"use client";

import { useState } from "react";
import Link from "next/link";
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
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <div>
        <form onSubmit={onSubmit}>
          <label
            htmlFor="repositoryUrl"
            className="block text-sm font-medium text-zinc-400"
          >
            Repository URL
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Points (<code className="font-mono">points:*</code>) and difficulty (
            <code className="font-mono">difficulty:*</code>) are read from GitHub
            labels.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="repositoryUrl"
              type="url"
              autoComplete="off"
              placeholder="https://github.com/owner/repo"
              className="h-12 w-full border border-zinc-700 bg-zinc-900/40 px-4 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-accent"
              {...register("repositoryUrl")}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-accent px-5 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Importing&hellip;
                </>
              ) : (
                "Import repository"
              )}
            </button>
          </div>
          {errors.repositoryUrl && (
            <p className="mt-2 flex items-center gap-2 text-sm text-red-400">
              <AlertIcon />
              {errors.repositoryUrl.message}
            </p>
          )}
          {serverError && (
            <div className="mt-3 border-l-2 border-red-500 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              <span className="mr-2 font-bold uppercase tracking-wider text-red-300">
                Server
              </span>
              {serverError}
            </div>
          )}
        </form>

        <div className="mt-10">
          <h2 className="text-lg font-extrabold text-white">
            Imported repositories{" "}
            <span className="text-accent">{repositories.length}</span>
          </h2>

          {repositories.length === 0 ? (
            <div className="mt-4 border border-dashed border-zinc-700 p-8">
              <p className="text-lg font-extrabold text-white">
                None yet. Import one above.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-800 border-t border-zinc-800">
              {repositories.map((repo) => (
                <li
                  key={repo.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <a
                      href={
                        repo.html_url ?? `https://github.com/${repo.full_name}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm font-bold text-accent hover:underline"
                    >
                      {repo.full_name}
                    </a>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {repo.issue_count} issue{repo.issue_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onReimport(repo)}
                      disabled={busyRepoId === repo.id}
                      className="inline-flex h-9 items-center gap-2 border border-zinc-700 px-3 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900 disabled:opacity-60"
                    >
                      {busyRepoId === repo.id ? (
                        <>
                          <Spinner />
                          Working&hellip;
                        </>
                      ) : (
                        "Re-import"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(repo)}
                      disabled={busyRepoId === repo.id}
                      className="inline-flex h-9 items-center border border-zinc-700 px-3 text-sm font-bold text-red-400 transition-colors hover:bg-red-950/30 disabled:opacity-60"
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

      {/* Import result */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
          Import result
        </p>
        {result ? (
          <div className="mt-3 border border-zinc-800 p-6">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
              <CheckIcon />
              Imported
            </p>
            <p className="mt-3 break-all font-mono text-lg font-bold text-white">
              {result.repository.full_name}
            </p>
            <dl className="mt-4 border-t border-zinc-800 text-sm">
              <ResultRow label="Issues found" value={result.totalFetched} />
              <ResultRow label="Valid metadata" value={result.validIssues} />
              <ResultRow
                label="Need label fixes"
                value={result.invalidMetadata}
                danger={result.invalidMetadata > 0}
              />
            </dl>
            {result.invalidMetadata > 0 && (
              <Link
                href="/admin/issues"
                className="mt-4 inline-block text-sm font-bold text-accent hover:underline"
              >
                Review the {result.invalidMetadata} →
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-3 border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
            Run an import to see the summary here.
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 py-2.5">
      <dt className={danger ? "text-red-400" : "text-zinc-400"}>{label}</dt>
      <dd
        className={`font-extrabold ${danger ? "text-red-400" : "text-white"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
