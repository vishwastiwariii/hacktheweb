import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import LogoutButton from "@/app/components/auth/logout-button";
import UserAvatar from "@/app/components/ui/user-avatar";
import { getEvent } from "@/app/lib/services/event.service";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/issues", label: "Issues" },
  { href: "/repositories", label: "Targets" },
  { href: "/leaderboard", label: "Battle" },
];

const NAV_LINK =
  "font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-accent";

// Shared top bar for the signed-in student area (dashboard, issues, repositories).
// Self-contained: reads the current user + active event itself so pages just
// drop <AppHeader /> at the top. Styled to continue the landing page's system.
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
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-white transition-colors hover:text-accent"
        >
          <span className="inline-block h-1.5 w-1.5 bg-accent" aria-hidden />
          Hack The Web
        </Link>

        <nav aria-label="Primary" className="order-3 flex w-full gap-6 sm:order-none sm:w-auto">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={NAV_LINK}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {eventName && (
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-600 lg:block">
              {eventName}
            </span>
          )}
          <span className="flex items-center gap-2 text-sm text-zinc-300">
            <UserAvatar src={avatarUrl} name={name} size={28} />
            <span className="hidden sm:inline">{name}</span>
          </span>
          <LogoutButton className="inline-flex h-9 items-center gap-2 border border-zinc-700 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-100 transition-colors hover:border-accent hover:text-accent">
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
