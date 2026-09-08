// GitHub's own closing-keyword syntax: `Fixes #42`, `Closes: #42`,
// `Resolves owner/repo#42`. The optional colon mirrors what GitHub accepts.
const ISSUE_PATTERNS = [
  /\b(?:fixes|fixed|fix|closes|closed|close|resolves|resolved|resolve)\s*:?\s+#(\d+)/gi,
  /\b(?:fixes|fixed|fix|closes|closed|close|resolves|resolved|resolve)\s*:?\s+[\w.-]+\/[\w.-]+#(\d+)/gi,
];

export function extractGithubIssueNumber (
    title: string, 
    body: string | null
) : number[] {
    const text = `${title}\n${body ?? ""}`; 

    const issues = new Set<number>(); 

    for (const pattern of ISSUE_PATTERNS) {
        for (const match of text.matchAll(pattern)) {
            const number = Number(match[1]); 

            if (Number.isInteger(number)) {
                issues.add(number)
            }
        }
    }

    return [...issues]
}