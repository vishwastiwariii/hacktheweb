import Link from "next/link";

const SECTIONS = [
  {
    href: "/admin/repositories",
    title: "Repositories",
    description:
      "Add or remove the repos whose pull requests count for the event.",
  },
  {
    href: "/admin/issues",
    title: "Issues",
    description: "Review registered issues and edit their points or status.",
  },
];

export default function AdminHomePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Manage the hackathon configuration.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-lg border border-zinc-200 p-5 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <p className="text-sm font-medium">{section.title}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
