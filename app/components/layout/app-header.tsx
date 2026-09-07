import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import LogoutButton from "@/app/components/auth/logout-button";
import UserAvatar from "@/app/components/ui/user-avatar";
import { getEvent } from "@/app/lib/services/event.service";

// Shared top bar for the signed-in student area (dashboard, issues, repositories).
// Self-contained: reads the current user + active event itself so pages just
// drop <AppHeader /> at the top.
export default async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta = user?.user_metadata ?? {};
  const name = meta.full_name ?? meta.name ?? meta.user_name ?? "Account";
  const avatarUrl = meta.avatar_url as string | undefined;

  const eventId = process.env.ACTIVE_EVENT_ID;
  const eventName = eventId
    ? await getEvent(supabase, eventId)
        .then((event) => (event?.name as string | undefined) ?? null)
        .catch(() => null)
    : null;

  return (
    <header className="border-b border-zinc-800">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/dashboard"
          className="text-lg font-extrabold tracking-tight text-white"
        >
          Hack The Web
        </Link>
        {eventName && (
          <span className="hidden text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 sm:block">
            {eventName}
          </span>
        )}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-zinc-300">
            <UserAvatar src={avatarUrl} name={name} size={28} />
            <span className="hidden sm:inline">{name}</span>
          </span>
          <LogoutButton className="inline-flex h-9 items-center gap-2 border border-zinc-700 px-4 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900">
            <LogoutIcon />
            Log out
          </LogoutButton>
        </div>
      </div>
    </header>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
