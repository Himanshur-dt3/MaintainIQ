import {
  MaintenanceFrequency,
  MaintenancePlanStatus,
  MaintenanceType,
  Priority,
} from "@prisma/client";
import { z } from "zod";

const trimmedText = (
  fieldName: string,
  minimum: number,
  maximum: number,
) =>
  z
    .string()
    .trim()
    .min(minimum, `${fieldName} is required.`)
    .max(maximum, `${fieldName} must be ${maximum} characters or fewer.`);

export const maintenancePlanIdSchema = z
  .string()
  .uuid("Maintenance plan ID must be a valid UUID.");

export const maintenancePlanStatusSchema =
  z.nativeEnum(MaintenancePlanStatus);

export const maintenanceFrequencySchema =
  z.nativeEnum(MaintenanceFrequency);

export const maintenanceTypeSchema =
  z.nativeEnum(MaintenanceType);

export const maintenancePrioritySchema =
  z.nativeEnum(Priority);

export const createMaintenancePlanSchema = z
  .object({
    assetId: z.string().uuid("Asset ID must be a valid UUID."),
    technicianId: z
      .string()
      .uuid("Technician ID must be a valid UUID.")
      .nullable()
      .optional(),
    title: trimmedText("Title", 3, 160),
    description: z
      .string()
      .trim()
      .max(2000, "Description must be 2000 characters or fewer.")
      .nullable()
      .optional(),
    type: maintenanceTypeSchema,
    frequency: maintenanceFrequencySchema,
    priority: maintenancePrioritySchema,
    nextDueAt: z.coerce.date(),
    notes: z
      .string()
      .trim()
      .max(4000, "Notes must be 4000 characters or fewer.")
      .nullable()
      .optional(),
  })
  .strict();

export const updateMaintenancePlanSchema = z
  .object({
    technicianId: z
      .string()
      .uuid("Technician ID must be a valid UUID.")
      .nullable()
      .optional(),
    title: trimmedText("Title", 3, 160).optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Description must be 2000 characters or fewer.")
      .nullable()
      .optional(),
    type: maintenanceTypeSchema.optional(),
    frequency: maintenanceFrequencySchema.optional(),
    priority: maintenancePrioritySchema.optional(),
    nextDueAt: z.coerce.date().optional(),
    notes: z
      .string()
      .trim()
      .max(4000, "Notes must be 4000 characters or fewer.")
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided.",
  );

export const maintenancePlanListFiltersSchema = z
  .object({
    assetId: z.string().uuid("Asset ID must be a valid UUID.").optional(),
    technicianId: z
      .string()
      .uuid("Technician ID must be a valid UUID.")
      .optional(),
    status: maintenancePlanStatusSchema.optional(),
    priority: maintenancePrioritySchema.optional(),
    type: maintenanceTypeSchema.optional(),
    frequency: maintenanceFrequencySchema.optional(),
    dueBefore: z.coerce.date().optional(),
  })
  .strict();

export type CreateMaintenancePlanInput = z.infer<
  typeof createMaintenancePlanSchema
>;

export type UpdateMaintenancePlanInput = z.infer<
  typeof updateMaintenancePlanSchema
>;

export type MaintenancePlanListFilters = z.infer<
  typeof maintenancePlanListFiltersSchema
>;