"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function SignInPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGitHub() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const result = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // On success the browser leaves for GitHub, so we only get here if it failed.
    if (result.error) {
      console.error("GitHub sign-in failed:", result.error.message);
      setError(
        "We couldn't complete GitHub sign-in. Try again, or check that you granted access to your email.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-4xl font-extrabold tracking-tight text-white">
        Sign in
      </h1>
      <p className="mt-3 text-zinc-400">
        Sign in with GitHub to join a team and start claiming issues.
      </p>

      <button
        type="button"
        onClick={signInWithGitHub}
        disabled={loading}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2.5 bg-accent px-4 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <>
            <Spinner />
            Redirecting to GitHub&hellip;
          </>
        ) : (
          <>
            <GitHubIcon />
            Continue with GitHub
          </>
        )}
      </button>

      {error && (
        <div
          role="alert"
          className="mt-4 border-l-2 border-red-500 bg-red-950/40 px-4 py-3 text-sm text-red-100"
        >
          <span className="mr-2 font-bold uppercase tracking-wider text-red-300">
            Error
          </span>
          {error}
        </div>
      )}

      <p className="mt-6 text-sm text-zinc-500">
        We only read your public profile. Nothing is posted on your behalf.
      </p>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
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
