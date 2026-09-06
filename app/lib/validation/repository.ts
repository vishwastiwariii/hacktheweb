import { z } from "zod"

// The admin supplies only a GitHub repository URL; everything else is pulled
// from GitHub during import.
export const importRepositorySchema = z.object({
    repositoryUrl: z
        .string()
        .trim()
        .url("Enter a valid GitHub repository URL")
        .refine(
            (value) => /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/?$/.test(value),
            "Expected a URL like https://github.com/owner/repo",
        ),
})

export type ImportRepositoryInput = z.infer<typeof importRepositorySchema>
