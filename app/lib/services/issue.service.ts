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
    github_created_at: string | null;
    github_updated_at: string | null;
    created_at: string;
    updated_at: string | null;
};

export type IssueRecord = IssueRow & {
    event_id: string;
    repo_full_name: string;
    claimed: boolean;
};

export type IssuePage = {
    issues: IssueRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

const ISSUE_COLUMNS =
    "id, repository_id, github_issue_id, github_issue_number, title, description, html_url, points, difficulty, labels, available, metadata_valid, metadata_error, github_created_at, github_updated_at, created_at, updated_at";

const DEFAULT_PAGE_SIZE = 20;

type EmbeddedRepo = { id: string; event_id: string; owner: string; name: string };

function shape(raw: unknown): IssueRecord {
    const { issue_claims, repositories, ...issue } = raw as IssueRow & {
        issue_claims: { id: string }[] | null;
        repositories: EmbeddedRepo | EmbeddedRepo[] | null;
    };
    const repo = Array.isArray(repositories) ? repositories[0] ?? null : repositories;
    return {
        ...issue,
        event_id: repo?.event_id ?? "",
        repo_full_name: repo ? `${repo.owner}/${repo.name}` : "unknown",
        claimed: (issue_claims?.length ?? 0) > 0,
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
    }
): Promise<IssuePage> {
    const page = Math.max(1, Math.floor(opts.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? DEFAULT_PAGE_SIZE));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from("hackathon_issues")
        .select(
            `${ISSUE_COLUMNS}, repositories!inner ( id, event_id, owner, name ), issue_claims ( id )`,
            { count: "exact" }
        )
        .eq("repositories.event_id", opts.eventId)
        .order("github_issue_number", { ascending: true })
        .range(from, to);

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

export async function getIssue(
    supabase: SupabaseClient,
    issueId: string
): Promise<IssueRecord | null> {
    const { data, error } = await supabase
        .from("hackathon_issues")
        .select(
            `${ISSUE_COLUMNS}, repositories ( id, event_id, owner, name ), issue_claims ( id )`
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
            `${ISSUE_COLUMNS}, repositories ( id, event_id, owner, name ), issue_claims ( id )`
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
