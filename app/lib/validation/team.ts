import { z } from "zod"

export const createTeamSchema = z.object({
    name: z
        .string()
        .trim()
        .min(3, "Team name must be at least 3 characters.")
        .max(50, "Team name must be 50 characters or fewer.")
})

export const joinTeamSchema = z.object({
    joinCode: z
        .string()
        .trim()
        .toUpperCase()
        .length(6, "Enter all 6 characters of the code.")
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type JoinTeamInput = z.infer<typeof joinTeamSchema>
