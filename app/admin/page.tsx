import Link from "next/link";

const LIVE = [
  {
    href: "/admin/repositories",
    title: "Repositories",
    description:
      "Import a repo by URL, re-sync it when maintainers add issues, or remove one from the event.",
  },
  {
    href: "/admin/issues",
    title: "Issues",
    description:
      "Check difficulty and point labels, fix bad metadata, and switch issues on or off for claiming.",
  },
  {
    href: "/admin/contributions",
    title: "Contribution review",
    description:
      "Open each merged PR, then approve to release the issue's points to the team or reject to award nothing.",
  },
];

const COMING = [
  {
    title: "Event config",
    description: "Dates, team size, point values and the leaderboard freeze time.",
  },
];

export default function AdminHomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        Organiser tools
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Import the repositories, keep the issue labels honest, and approve work as
        it comes in. Everything here is visible to organisers only.
      </p>

      <hr className="my-8 border-zinc-800" />

      <div className="grid gap-px border border-zinc-800 bg-zinc-800 sm:grid-cols-2">
        {LIVE.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-background p-8 transition-colors hover:bg-zinc-900/50"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
              Setup
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-white">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {card.description}
            </p>
            <span className="mt-4 inline-block text-sm font-bold text-accent">
              Open →
            </span>
          </Link>
        ))}

        {COMING.map((card) => (
          <div key={card.title} className="bg-zinc-900/40 p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600">
              Coming
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-zinc-500">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
