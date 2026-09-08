import { z } from "zod"

// The only thing an admin may change on an issue: whether it takes part in the
// hackathon. Points, difficulty, title and description all come from GitHub.
export const setIssueAvailabilitySchema = z.object({
    issueId: z.string().uuid("Invalid issue id"),
    available: z.boolean(),
})

export type SetIssueAvailabilityInput = z.infer<typeof setIssueAvailabilitySchema>

// A participant claiming an issue for their team. The server re-derives the
// team and re-checks everything else; the client only sends which issue.
export const claimIssueSchema = z.object({
    issueId: z.string().uuid("Invalid issue id"),
})

export type ClaimIssueInput = z.infer<typeof claimIssueSchema>
