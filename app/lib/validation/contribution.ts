import { z } from "zod";

// Admin review actions. The client sends only which contribution — the server
// re-derives everything else and the point value comes from the GitHub label.
export const approveContributionSchema = z.object({
  contributionId: z.string().uuid("Invalid contribution id"),
});

export const rejectContributionSchema = z.object({
  contributionId: z.string().uuid("Invalid contribution id"),
  note: z.string().trim().max(500, "Keep the note under 500 characters").optional(),
});

export type ApproveContributionInput = z.infer<typeof approveContributionSchema>;
export type RejectContributionInput = z.infer<typeof rejectContributionSchema>;
