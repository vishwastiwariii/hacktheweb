import { createClient } from "@/app/lib/supabase/server";
import { parseGitHubRepositoryUrl } from "./parse-repository-url";
import { getGitHubRepository } from "./repository";
import { getAllGitHubIssues } from "./issues";
import { parseIssueLabels } from "./labels";

export type ImportSummary = {
    repository: {
        id: string;
        owner: string;
        name: string;
        full_name: string;
        html_url: string | null;
    };
    totalFetched: number;
    importedIssues: number;
    invalidMetadata: number;
};

// GitHub URL -> repo metadata + all open issues -> Supabase.
// Idempotent: repositories upsert on (event_id, github_repo_id), issues on
// (repository_id, github_issue_id). Re-import refreshes GitHub-owned fields and
// deliberately leaves the platform-owned `available` flag untouched.
export async function importGitHubRepository(
    repositoryUrl: string,
    eventId: string,
): Promise<ImportSummary> {
    const supabase = await createClient();

    const { owner, repo } = parseGitHubRepositoryUrl(repositoryUrl);
    const ghRepo = await getGitHubRepository(owner, repo);

    const { data: savedRepository, error: repoError } = await supabase
        .from("repositories")
        .upsert(
            {
                event_id: eventId,
                github_repo_id: ghRepo.github_repo_id,
                owner: ghRepo.owner,
                name: ghRepo.name,
                html_url: ghRepo.html_url,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "event_id,github_repo_id" },
        )
        .select("id, owner, name, full_name, html_url")
        .single();

    if (repoError || !savedRepository) {
        throw new Error(repoError?.message ?? "Failed to save the repository");
    }

    const issues = await getAllGitHubIssues(owner, repo);

    const now = new Date().toISOString();
    let invalidMetadata = 0;

    const rows = issues.map((issue) => {
        let points: number | null = null;
        let difficulty: string | null = null;
        let metadataError: string | null = null;

        try {
            const parsed = parseIssueLabels(
                (issue.labels ?? []) as Array<string | { name?: string | null }>,
            );
            points = parsed.points;
            difficulty = parsed.difficulty;

            if (points === null) metadataError = "Missing points:* label";
            else if (difficulty === null) metadataError = "Missing difficulty:* label";
        } catch (err) {
            metadataError = err instanceof Error ? err.message : "Invalid labels";
        }

        const metadataValid = metadataError === null;
        if (!metadataValid) invalidMetadata++;

        return {
            repository_id: savedRepository.id,
            github_issue_id: issue.id,
            github_issue_number: issue.number,
            title: issue.title,
            description: issue.body ?? null,
            html_url: issue.html_url,
            points: points ?? 0,
            difficulty,
            labels: issue.labels ?? [],
            metadata_valid: metadataValid,
            metadata_error: metadataError,
            github_created_at: issue.created_at,
            github_updated_at: issue.updated_at,
            updated_at: now,
            // `available` is intentionally omitted so re-import preserves it.
        };
    });

    if (rows.length > 0) {
        const { error: issuesError } = await supabase
            .from("hackathon_issues")
            .upsert(rows, { onConflict: "repository_id,github_issue_id" });

        if (issuesError) {
            throw new Error(issuesError.message);
        }
    }

    return {
        repository: savedRepository,
        totalFetched: issues.length,
        importedIssues: rows.length,
        invalidMetadata,
    };
}
