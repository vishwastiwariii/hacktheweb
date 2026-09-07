"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTeamSchema } from "@/app/lib/validation/team";
import { createTeamAction } from "@/app/dashboard/team/actions";

export default function CreateTeamForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: "" },
  });

  // On success the action redirects to /dashboard/team, so we only handle the
  // error case here.
  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await createTeamAction(values);
    if (result?.error) {
      setServerError(result.error);
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-4">
      <div>
        <label
          htmlFor="team-name"
          className="block text-sm font-medium text-zinc-400"
        >
          Team name
        </label>
        <input
          id="team-name"
          type="text"
          autoComplete="off"
          placeholder="The Merge Conflicts"
          className="mt-2 h-12 w-full border border-zinc-700 bg-zinc-900/40 px-4 text-base text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-accent"
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-2 flex items-center gap-2 text-sm text-red-400">
            <AlertIcon />
            {errors.name.message}
          </p>
        )}
      </div>

      {serverError && (
        <div
          role="alert"
          className="border-l-2 border-red-500 bg-red-950/40 px-4 py-3 text-sm text-red-100"
        >
          <span className="mr-2 font-bold uppercase tracking-wider text-red-300">
            Server
          </span>
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-12 items-center justify-center gap-2 bg-accent px-6 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Spinner />
            Creating&hellip;
          </>
        ) : (
          "Create team"
        )}
      </button>
    </form>
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
