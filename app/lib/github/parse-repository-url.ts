export type ParsedRepo = { owner: string; repo: string };

// Accepts https://github.com/owner/repo (with or without a trailing slash or a
// ".git" suffix). Rejects anything that is not a github.com repo URL.
export function parseGitHubRepositoryUrl(input: string): ParsedRepo {
    let parsed: URL;
    try {
        parsed = new URL(input.trim());
    } catch {
        throw new Error("Enter a valid URL, e.g. https://github.com/owner/repo");
    }

    const host = parsed.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") {
        throw new Error("Only GitHub repository URLs are supported");
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) {
        throw new Error(
            "Invalid GitHub repository URL — expected github.com/owner/repo",
        );
    }

    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
}
