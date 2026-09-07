import { z } from "zod"

// The admin supplies only a GitHub repository URL; everything else is pulled
// from GitHub during import.
export const importRepositorySchema = z.object({
    repositoryUrl: z
        .string()
        .trim()
        .url("That doesn't look like a github.com/owner/repo URL.")
        .refine(
            (value) => /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/?$/.test(value),
            "That doesn't look like a github.com/owner/repo URL.",
        ),
})

export type ImportRepositoryInput = z.infer<typeof importRepositorySchema>
