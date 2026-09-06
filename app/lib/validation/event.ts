import { z } from "zod"

// PATCH body for the admin event config endpoint. Every field is optional so a
// request can touch any subset, but at least one must be present — an empty
// update is a client mistake, not a no-op we want to run.
export const updateEventSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Event name should be greater than 2 characters")
            .max(120, "Event name should be less than 120 characters"),
        description: z
            .string()
            .trim()
            .max(2000, "Description should be less than 2000 characters"),
        registration_open: z.boolean(),
        starts_at: z.iso
            .datetime({ offset: true, message: "starts_at must be an ISO 8601 timestamp" })
            .nullable(),
        ends_at: z.iso
            .datetime({ offset: true, message: "ends_at must be an ISO 8601 timestamp" })
            .nullable(),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: "Provide at least one field to update",
    })

export type UpdateEventInput = z.infer<typeof updateEventSchema>
