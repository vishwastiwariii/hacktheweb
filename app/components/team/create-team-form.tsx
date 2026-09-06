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
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <div>
        <label
          htmlFor="team-name"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Team name
        </label>
        <input
          id="team-name"
          type="text"
          autoComplete="off"
          placeholder="The Merge Conflicts"
          className="mt-1.5 h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none transition-colors focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {errors.name.message}
          </p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isSubmitting ? "Creating..." : "Create team"}
      </button>
    </form>
  );
}
