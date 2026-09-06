import { z } from "zod"

export const createTeamSchema = z.object({
    name: z.string().trim().min(2, "Team Name should be greater than 2 characters").max(50, "Team Name should be less than 50 characters")
})

export const joinTeamSchema = z.object({
    joinCode: z.string().trim().toUpperCase().length(6, "Invalid Join Code")
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type JoinTeamInput = z.infer<typeof joinTeamSchema>