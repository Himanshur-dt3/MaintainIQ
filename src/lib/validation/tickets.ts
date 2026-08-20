import { IssueType, Priority, TicketStatus } from "@prisma/client";
import { z } from "zod";

const trimmedText = (fieldName: string, minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum, `${fieldName} is required.`)
    .max(maximum, `${fieldName} must be ${maximum} characters or fewer.`);

const shortAiText = (fieldName: string, maximum: number) =>
  trimmedText(fieldName, 1, maximum);

export const ticketIdSchema = z.string().uuid("Ticket ID must be a valid UUID.");

export const ticketStatusSchema = z.nativeEnum(TicketStatus);
export const prioritySchema = z.nativeEnum(Priority);
export const issueTypeSchema = z.nativeEnum(IssueType);

/**
 * The reporter-provided facts used to generate an AI recommendation.
 * Classification, priority, and asset selection remain server-derived.
 */
export const ticketIntakeSchema = z
  .object({
    title: trimmedText("Title", 3, 160),
    description: trimmedText("Description", 10, 5000),
    location: trimmedText("Location", 2, 160),
  })
  .strict();

const aiAssetRecommendationFields = {
  asset_id: z.string().uuid("AI asset ID must be a valid UUID.").nullable(),
  asset_name: shortAiText("AI asset name", 160),
  asset_type: shortAiText("AI asset type", 160),
  asset_location: shortAiText("AI asset location", 160),
  create_asset: z.boolean(),
};

const validateAiAssetRecommendation = (
  asset: {
    asset_id: string | null;
    create_asset: boolean;
  },
  context: z.RefinementCtx,
) => {
    if (asset.create_asset && asset.asset_id !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["asset_id"],
        message: "New asset recommendations must not include an asset ID.",
      });
    }

    if (!asset.create_asset && asset.asset_id === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["asset_id"],
        message: "Existing asset recommendations require an asset ID.",
      });
    }
  };

export const aiAssetRecommendationSchema = z
  .object(aiAssetRecommendationFields)
  .strict()
  .superRefine(validateAiAssetRecommendation);

export const aiTriageRecommendationSchema = z
  .object({
    issue_type: issueTypeSchema,
    priority: prioritySchema,
    possible_causes: z
      .array(shortAiText("Possible cause", 280))
      .min(1, "Provide at least one possible cause.")
      .max(5, "Provide no more than five possible causes."),
    recommended_technician: shortAiText("Recommended technician", 160),
    suggested_action: shortAiText("Suggested action", 1000),
    confidence: z
      .number()
      .finite("Confidence must be a finite number.")
      .min(0, "Confidence must be between 0 and 1.")
      .max(1, "Confidence must be between 0 and 1."),
    ...aiAssetRecommendationFields,
  })
  .strict()
  .superRefine(validateAiAssetRecommendation);

export const createTicketSchema = z.object({
  title: trimmedText("Title", 3, 160),
  description: trimmedText("Description", 10, 5000),
  location: trimmedText("Location", 2, 160),
  issueType: issueTypeSchema,
  priority: prioritySchema,
  assetId: z.string().uuid("Asset ID must be a valid UUID."),
});

export const assignTicketSchema = z.object({
  technicianId: z.string().uuid("Technician ID must be a valid UUID."),
});

export const adminTicketFiltersSchema = z
  .object({
    status: ticketStatusSchema.optional(),
    priority: prioritySchema.optional(),
    issueType: issueTypeSchema.optional(),
    technicianId: z.string().uuid("Technician ID must be a valid UUID.").optional(),
  })
  .strict();

export const reviewTicketSchema = z
  .object({
    issueType: issueTypeSchema.optional(),
    priority: prioritySchema.optional(),
    reviewNote: trimmedText("Review note", 3, 2000),
  })
  .strict()
  .superRefine((input, context) => {
    if (!input.issueType && !input.priority) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select an issue type or priority to override.",
      });
    }
  });

export const startWorkSchema = z.object({}).strict();

export const addWorkNoteSchema = z.object({
  note: trimmedText("Work note", 1, 2000),
});

export const resolveTicketSchema = z.object({
  resolutionNotes: trimmedText("Resolution note", 1, 4000),
});

export type TicketIntakeInput = z.infer<typeof ticketIntakeSchema>;
export type AiAssetRecommendation = z.infer<typeof aiAssetRecommendationSchema>;
export type AiTriageRecommendation = z.infer<typeof aiTriageRecommendationSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type AdminTicketFilters = z.infer<typeof adminTicketFiltersSchema>;
export type ReviewTicketInput = z.infer<typeof reviewTicketSchema>;
export type AddWorkNoteInput = z.infer<typeof addWorkNoteSchema>;
export type ResolveTicketInput = z.infer<typeof resolveTicketSchema>;

/**
 * Converts a Zod validation failure into a user-safe field error map.
 *
 * @param error - The validation error returned by a Zod schema.
 * @returns A field-keyed map suitable for a controlled JSON API response.
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((errors, issue) => {
    const field = issue.path.join(".") || "request";

    if (!errors[field]) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}
