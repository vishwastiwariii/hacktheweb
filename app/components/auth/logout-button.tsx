"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

const DEFAULT_CLASS =
  "h-9 shrink-0 border border-zinc-700 px-4 text-sm font-bold transition-colors hover:bg-zinc-900";

export default function LogoutButton({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();

    // refresh() throws away the cached server render, so the dashboard
    // does not keep showing the old user after we navigate away.
    router.refresh();
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={`${className ?? DEFAULT_CLASS} disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {pending ? (
        <>
          <Spinner />
          Signing out&hellip;
        </>
      ) : (
        (children ?? "Log out")
      )}
    </button>
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
