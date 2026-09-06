import { SupabaseClient } from "@supabase/supabase-js";

// Repositories are imported from GitHub (see app/lib/github/import-repository).
// Columns: id, event_id, owner, name, github_repo_id, html_url, full_name
// (generated "owner/name"), created_at, updated_at.
export type RepositorySummary = {
    id: string;
    event_id: string;
    owner: string;
    name: string;
    github_repo_id: number | null;
    full_name: string;
    html_url: string | null;
    created_at: string;
    updated_at: string | null;
    issue_count: number;
};

const REPOSITORY_COLUMNS =
    "id, event_id, owner, name, github_repo_id, full_name, html_url, created_at, updated_at";

export async function getRepositories(
    supabase: SupabaseClient,
    eventId: string
): Promise<RepositorySummary[]> {
    const { data, error } = await supabase
        .from("repositories")
        .select(`${REPOSITORY_COLUMNS}, hackathon_issues ( count )`)
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return ((data ?? []) as Array<
        Omit<RepositorySummary, "issue_count"> & {
            hackathon_issues: { count: number }[] | null;
        }
    >).map(({ hackathon_issues, ...repo }) => ({
        ...repo,
        issue_count: hackathon_issues?.[0]?.count ?? 0,
    }));
}

export async function deleteRepository(
    supabase: SupabaseClient,
    eventId: string,
    repositoryId: string
): Promise<void> {
    const { data: existing, error: findError } = await supabase
        .from("repositories")
        .select("id")
        .eq("id", repositoryId)
        .eq("event_id", eventId)
        .maybeSingle();

    if (findError) {
        throw new Error(findError.message);
    }

    if (!existing) {
        throw new Error("Repository not found");
    }

    // Remove the imported issues first so the FK does not block the delete.
    const { error: issuesError } = await supabase
        .from("hackathon_issues")
        .delete()
        .eq("repository_id", repositoryId);

    if (issuesError) {
        throw new Error(issuesError.message);
    }

    const { error } = await supabase
        .from("repositories")
        .delete()
        .eq("id", repositoryId)
        .eq("event_id", eventId);

    if (error) {
        throw new Error(error.message);
    }
}
