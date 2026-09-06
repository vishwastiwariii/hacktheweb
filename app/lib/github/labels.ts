export type Difficulty = "easy" | "medium" | "hard";

export type IssueMetadata = {
    points: number | null;
    difficulty: Difficulty | null;
};

// A GitHub label is either a string or an object with a `name`.
export type RawLabel = string | { name?: string | null } | null | undefined;

export function labelNames(labels: RawLabel[]): string[] {
    return labels
        .map((label) => (typeof label === "string" ? label : label?.name ?? ""))
        .map((name) => name.trim())
        .filter(Boolean);
}

// Reads `points:<int>` and `difficulty:<easy|medium|hard>` from an issue's
// labels. Exactly one points label and at most one difficulty label are
// allowed; anything else throws so the caller can mark the issue invalid.
// Other labels are ignored.
export function parseIssueLabels(labels: RawLabel[]): IssueMetadata {
    let points: number | null = null;
    let difficulty: Difficulty | null = null;
    let pointsFound = 0;
    let difficultyFound = 0;

    for (const name of labelNames(labels).map((n) => n.toLowerCase())) {
        if (name.startsWith("points:")) {
            pointsFound++;
            const value = Number(name.slice("points:".length).trim());
            if (!Number.isInteger(value) || value < 0) {
                throw new Error(`Invalid points label: "${name}"`);
            }
            points = value;
        }

        if (name.startsWith("difficulty:")) {
            difficultyFound++;
            const value = name.slice("difficulty:".length).trim();
            if (value !== "easy" && value !== "medium" && value !== "hard") {
                throw new Error(`Invalid difficulty label: "${name}"`);
            }
            difficulty = value;
        }
    }

    if (pointsFound > 1) {
        throw new Error("Issue has multiple points:* labels");
    }
    if (difficultyFound > 1) {
        throw new Error("Issue has multiple difficulty:* labels");
    }

    return { points, difficulty };
}
