import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/app/lib/auth/admin";
import { importGitHubRepository } from "@/app/lib/github/import-repository";

const importSchema = z.object({
    repositoryUrl: z.string().url("Enter a valid GitHub repository URL"),
});

function errorResponse(err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    // Auth
    if (message === "Unauthorized User") {
        return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "Not an Admin" || message === "Profile not found") {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    // GitHub (Octokit RequestError carries a numeric `status`). Never surface
    // the token or a stack trace.
    const status =
        typeof (err as { status?: unknown })?.status === "number"
            ? (err as { status: number }).status
            : null;
    // Log the GitHub status + message (never the token) so the real cause shows
    // up in the deployment logs, not just a generic 502.
    if (status !== null) {
        console.error(`[import] GitHub API error ${status}: ${message}`);
    }

    if (status === 404) {
        return NextResponse.json(
            { error: "Repository not found or not accessible with the configured token" },
            { status: 404 },
        );
    }
    if (status === 401) {
        return NextResponse.json(
            {
                error:
                    "GitHub rejected GITHUB_TOKEN (bad credentials) — it is invalid, expired, revoked, or pasted with extra quotes/spaces",
            },
            { status: 502 },
        );
    }
    if (status === 403) {
        const rateLimited = /rate limit/i.test(message);
        if (rateLimited) {
            return NextResponse.json(
                { error: "GitHub rate limit reached — try again later" },
                { status: 429 },
            );
        }
        return NextResponse.json(
            {
                error: /SAML|SSO/i.test(message)
                    ? "GITHUB_TOKEN must be SSO-authorized for this organization"
                    : "GITHUB_TOKEN can't read this repo's issues — give it Issues: Read and Metadata: Read access to this repository",
            },
            { status: 502 },
        );
    }
    if (status === 410) {
        return NextResponse.json(
            { error: "Issues are disabled on this repository — enable them in its GitHub settings" },
            { status: 400 },
        );
    }
    if (status === 429) {
        return NextResponse.json(
            { error: "GitHub rate limit reached — try again later" },
            { status: 429 },
        );
    }
    if (status && status >= 500) {
        return NextResponse.json(
            { error: "GitHub is temporarily unavailable — try again later" },
            { status: 502 },
        );
    }

    if (message === "GITHUB_TOKEN is not configured") {
        return NextResponse.json({ error: message }, { status: 500 });
    }

    // URL parsing / label problems / everything else.
    return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
    try {
        await requireAdmin();

        const eventId = process.env.ACTIVE_EVENT_ID;
        if (!eventId) {
            return NextResponse.json(
                { error: "ACTIVE_EVENT_ID is not configured" },
                { status: 500 },
            );
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = importSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Invalid request" },
                { status: 422 },
            );
        }

        const summary = await importGitHubRepository(parsed.data.repositoryUrl, eventId);

        return NextResponse.json({
            success: true,
            repository: {
                name: summary.repository.name,
                full_name: summary.repository.full_name,
            },
            totalFetched: summary.totalFetched,
            importedIssues: summary.importedIssues,
            validIssues: summary.importedIssues - summary.invalidMetadata,
            invalidMetadata: summary.invalidMetadata,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
