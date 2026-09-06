import { Octokit } from "octokit";

// Server-only. GITHUB_TOKEN must never be exposed to the browser (no
// NEXT_PUBLIC_ prefix). For the MVP a personal access token is fine; production
// should move to a GitHub App installation token.
let client: Octokit | null = null;

export function githubClient(): Octokit {
    if (!process.env.GITHUB_TOKEN) {
        throw new Error("GITHUB_TOKEN is not configured");
    }
    if (!client) {
        client = new Octokit({ auth: process.env.GITHUB_TOKEN });
    }
    return client;
}
