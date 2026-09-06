import { githubClient } from "./client";

export type GitHubIssue = Awaited<
    ReturnType<ReturnType<typeof githubClient>["rest"]["issues"]["listForRepo"]>
>["data"][number];

// Fetches every open issue in the repo. GitHub's issues endpoint also returns
// pull requests (they carry a `pull_request` field) so those are filtered out.
// `octokit.paginate` walks all pages (100 per page) so repos with >100 issues
// come back complete.
export async function getAllGitHubIssues(
    owner: string,
    repo: string,
): Promise<GitHubIssue[]> {
    const gh = githubClient();

    const issues = await gh.paginate(gh.rest.issues.listForRepo, {
        owner,
        repo,
        state: "open",
        per_page: 100,
    });

    return issues.filter((issue) => !issue.pull_request);
}
