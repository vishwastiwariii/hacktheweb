// GitHub's own closing-keyword syntax: `Fixes #42`, `Closes: #42`,
// `Resolves owner/repo#42`. The optional colon mirrors what GitHub accepts.
// A cross-repo reference only counts when it names the PR's own repo — issue
// #42 of some other repo is not issue #42 here.
const KEYWORDS = "fixes|fixed|fix|closes|closed|close|resolves|resolved|resolve";
const ISSUE_PATTERN = new RegExp(
    `\\b(?:${KEYWORDS})\\s*:?\\s+(?:([\\w.-]+\\/[\\w.-]+))?#(\\d+)`,
    "gi",
);

export function extractGithubIssueNumber (
    title: string, 
    body: string | null,
    repoFullName?: string,
) : number[] {
    const text = `${title}\n${body ?? ""}`; 
    const ownRepo = repoFullName?.toLowerCase();

    const issues = new Set<number>(); 

    for (const match of text.matchAll(ISSUE_PATTERN)) {
        const repo = match[1]?.toLowerCase();
        if (repo && repo !== ownRepo) {
            continue;
        }

        const number = Number(match[2]); 

        if (Number.isInteger(number)) {
            issues.add(number)
        }
    }

    return [...issues]
}
