import { z } from "zod";

// Manual admin adjustment. Positive adds points, negative takes them away.
// The DB function re-checks all of this and refuses to go below 0.
export const adjustTeamPointsSchema = z.object({
  teamId: z.string().uuid("Invalid team id"),
  amount: z
    .number({ message: "Enter a whole number of points" })
    .int("Enter a whole number of points")
    .min(-10000, "Keep it between -10000 and 10000")
    .max(10000, "Keep it between -10000 and 10000")
    .refine((value) => value !== 0, "Amount can't be 0"),
  reason: z
    .string()
    .trim()
    .min(3, "Give a reason (at least 3 characters)")
    .max(200, "Keep the reason under 200 characters"),
});

export type AdjustTeamPointsInput = z.infer<typeof adjustTeamPointsSchema>;
