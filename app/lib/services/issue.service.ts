import { SupabaseClient } from "@supabase/supabase-js";
import type { Difficulty } from "@/app/lib/github/labels";

// Issues are imported from GitHub. GitHub owns title / description / labels /
// points / difficulty; the platform owns `available` (and claims downstream).
// Columns: id, repository_id, github_issue_id, github_issue_number, title,
// description, html_url, points, difficulty, labels, available, metadata_valid,
// metadata_error, github_created_at, github_updated_at, created_at, updated_at.
type IssueRow = {
    id: string;
    repository_id: string;
    github_issue_id: number | null;
    github_issue_number: number;
    title: string;
    description: string | null;
    html_url: string | null;
    points: number;
    difficulty: Difficulty | null;
    labels: unknown;
    available: boolean;
    metadata_valid: boolean;
    metadata_error: string | null;
    // Platform-derived: a merged "Fixes #n" PR closed this out. Solved issues
    // can't be claimed by anyone and render as solved everywhere they're listed.
    solved: boolean;
    solved_at: string | null;
    github_created_at: string | null;
    github_updated_at: string | null;
    created_at: string;
    updated_at: string | null;
};

export type IssueRecord = IssueRow & {
    event_id: string;
    repo_full_name: string;
    claimed: boolean;
    // Which team holds the claim, if any — lets a viewer tell "my team claimed
    // this" from "someone else did".
    claimedByTeamId: string | null;
};

export type IssuePage = {
    issues: IssueRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

const ISSUE_COLUMNS =
    "id, repository_id, github_issue_id, github_issue_number, title, description, html_url, points, difficulty, labels, available, metadata_valid, metadata_error, solved, solved_at, github_created_at, github_updated_at, created_at, updated_at";

const DEFAULT_PAGE_SIZE = 20;

type EmbeddedRepo = { id: string; event_id: string; owner: string; name: string };

type EmbeddedClaim = { id: string; team_id: string | null };

function shape(raw: unknown): IssueRecord {
    const { issue_claims, repositories, ...issue } = raw as IssueRow & {
        // `issue_claims.issue_id` is UNIQUE, so PostgREST embeds this as a single
        // object (older data / other shapes can still come through as an array).
        issue_claims: EmbeddedClaim | EmbeddedClaim[] | null;
        repositories: EmbeddedRepo | EmbeddedRepo[] | null;
    };
    const repo = Array.isArray(repositories) ? repositories[0] ?? null : repositories;
    const claim = Array.isArray(issue_claims)
        ? issue_claims[0] ?? null
        : issue_claims ?? null;
    return {
        ...issue,
        event_id: repo?.event_id ?? "",
        repo_full_name: repo ? `${repo.owner}/${repo.name}` : "unknown",
        claimed: claim != null,
        claimedByTeamId: claim?.team_id ?? null,
    };
}

export async function getIssuesPage(
    supabase: SupabaseClient,
    opts: {
        eventId: string;
        repositoryId?: string;
        claimableOnly?: boolean;
        page?: number;
        pageSize?: number;
        // "points" = highest value first (public browse); "issue_number" =
        // ascending, the default used by the admin list.
        orderBy?: "points" | "issue_number";
    }
): Promise<IssuePage> {
    const page = Math.max(1, Math.floor(opts.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? DEFAULT_PAGE_SIZE));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from("hackathon_issues")
        .select(
            `${ISSUE_COLUMNS}, repositories!inner ( id, event_id, owner, name ), issue_claims ( id, team_id )`,
            { count: "exact" }
        )
        .eq("repositories.event_id", opts.eventId);

    if ((opts.orderBy ?? "issue_number") === "points") {
        query = query
            .order("points", { ascending: false })
            .order("github_issue_number", { ascending: true });
    } else {
        query = query.order("github_issue_number", { ascending: true });
    }

    query = query.range(from, to);

    if (opts.repositoryId) {
        query = query.eq("repository_id", opts.repositoryId);
    }
    if (opts.claimableOnly) {
        query = query.eq("available", true).eq("metadata_valid", true);
    }

    const { data, error, count } = await query;

    if (error) {
        throw new Error(error.message);
    }

    const total = count ?? 0;
    return {
        issues: (data ?? []).map(shape),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
}

// Header stat for the browse pages: how many claimable issues exist and how
// many of those are already claimed. Best-effort — collapses to zeroes on error.
export async function getClaimableIssueCounts(
    supabase: SupabaseClient,
    eventId: string,
    repositoryId?: string
): Promise<{ open: number; claimed: number }> {
    try {
        let openQuery = supabase
            .from("hackathon_issues")
            .select("id, repositories!inner ( event_id )", {
                count: "exact",
                head: true,
            })
            .eq("repositories.event_id", eventId)
            .eq("available", true)
            .eq("metadata_valid", true);

        let claimedQuery = supabase
            .from("hackathon_issues")
            .select("id, repositories!inner ( event_id ), issue_claims!inner ( id )", {
                count: "exact",
                head: true,
            })
            .eq("repositories.event_id", eventId)
            .eq("available", true)
            .eq("metadata_valid", true);

        if (repositoryId) {
            openQuery = openQuery.eq("repository_id", repositoryId);
            claimedQuery = claimedQuery.eq("repository_id", repositoryId);
        }

        const [openRes, claimedRes] = await Promise.all([openQuery, claimedQuery]);
        return {
            open: openRes.count ?? 0,
            claimed: claimedRes.count ?? 0,
        };
    } catch {
        return { open: 0, claimed: 0 };
    }
}

export async function getIssue(
    supabase: SupabaseClient,
    issueId: string
): Promise<IssueRecord | null> {
    const { data, error } = await supabase
        .from("hackathon_issues")
        .select(
            `${ISSUE_COLUMNS}, repositories ( id, event_id, owner, name ), issue_claims ( id, team_id )`
        )
        .eq("id", issueId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            return null;
        }
        throw new Error(error.message);
    }

    return shape(data);
}

// The one platform-owned field an admin can change.
export async function setIssueAvailability(
    supabase: SupabaseClient,
    issueId: string,
    available: boolean
): Promise<IssueRecord> {
    const { data, error } = await supabase
        .from("hackathon_issues")
        .update({ available, updated_at: new Date().toISOString() })
        .eq("id", issueId)
        .select(
            `${ISSUE_COLUMNS}, repositories ( id, event_id, owner, name ), issue_claims ( id, team_id )`
        )
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            throw new Error("Issue not found");
        }
        throw new Error(error.message);
    }

    return shape(data);
}
