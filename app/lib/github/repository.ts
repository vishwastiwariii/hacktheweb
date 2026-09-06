import { githubClient } from "./client";

export type GitHubRepository = {
    github_repo_id: number;
    owner: string;
    name: string;
    full_name: string;
    html_url: string;
};

// GET /repos/{owner}/{repo} — repository metadata is the source of truth; the
// browser only ever supplies the URL.
export async function getGitHubRepository(
    owner: string,
    repo: string,
): Promise<GitHubRepository> {
    const { data } = await githubClient().rest.repos.get({ owner, repo });

    return {
        github_repo_id: data.id,
        owner: data.owner.login,
        name: data.name,
        full_name: data.full_name,
        html_url: data.html_url,
    };
}
