"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function SignInPanel({
  authError = false,
}: {
  // True when /auth/callback bounced back with ?error=auth.
  authError?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    authError
      ? "GitHub sent us back without a valid session. Try signing in again."
      : null,
  );

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
    <div className="w-full">
      <p className="htw-label">
        Identity&nbsp;&nbsp;·&nbsp;&nbsp;
        <span className="text-[var(--htw-fg)]">GITHUB_OAUTH</span>
      </p>
      <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.03em] text-[var(--htw-fg)]">
        Sign in
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--htw-muted)]">
        Your GitHub account is your identity on the board. One account, one
        team.
      </p>

      <button
        type="button"
        onClick={signInWithGitHub}
        disabled={loading}
        className="htw-btn htw-mono mt-8 flex h-13 w-full items-center justify-center gap-3 border border-[var(--htw-green)] bg-[var(--htw-green)] px-4 text-sm font-bold uppercase tracking-[0.18em] text-[#060607] transition-[background-color,color,box-shadow] duration-200 hover:bg-transparent hover:text-[var(--htw-green)] hover:shadow-[0_0_32px_var(--htw-green-dim)] disabled:cursor-not-allowed disabled:opacity-70"
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
          className="mt-4 border-l-2 border-[var(--htw-red)] bg-[rgba(255,61,46,0.08)] px-4 py-3 text-sm text-[var(--htw-fg)]"
        >
          <span className="htw-label mr-2 text-[var(--htw-red)]">Error</span>
          {error}
        </div>
      )}

      <p className="htw-label mt-6 normal-case tracking-normal">
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
