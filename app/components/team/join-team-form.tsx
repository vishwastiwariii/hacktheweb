"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { joinTeamSchema } from "@/app/lib/validation/team";
import { joinTeamAction } from "@/app/dashboard/team/actions";

export default function JoinTeamForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: { joinCode: "" },
  });

  // On success the action redirects to /dashboard/team, so we only handle the
  // error case here.
  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await joinTeamAction(values);
    if (result?.error) {
      setServerError(result.error);
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <div>
        <label
          htmlFor="join-code"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Join code
        </label>
        <input
          id="join-code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={6}
          placeholder="A1B2C3"
          className="mt-1.5 h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-sm uppercase tracking-[0.3em] outline-none transition-colors placeholder:tracking-normal focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
          {...register("joinCode")}
        />
        {errors.joinCode && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {errors.joinCode.message}
          </p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-lg border border-zinc-300 px-5 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {isSubmitting ? "Joining..." : "Join team"}
      </button>
    </form>
  );
}
