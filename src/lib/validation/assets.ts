import {
  AssetCriticality,
  AssetStatus,
} from "@prisma/client";
import { z } from "zod";

const assetName = z
  .string()
  .trim()
  .min(2, "Asset name is required.")
  .max(160, "Asset name must be 160 characters or fewer.");

const assetType = z
  .string()
  .trim()
  .min(2, "Asset type is required.")
  .max(120, "Asset type must be 120 characters or fewer.");

const assetLocation = z
  .string()
  .trim()
  .min(2, "Asset location is required.")
  .max(160, "Asset location must be 160 characters or fewer.");

export const assetIdSchema = z
  .string()
  .uuid("Asset ID must be a valid UUID.");

export const assetCriticalitySchema =
  z.nativeEnum(AssetCriticality);

export const assetStatusSchema =
  z.nativeEnum(AssetStatus);

export const createAssetSchema = z
  .object({
    name: assetName,
    type: assetType,
    location: assetLocation,
    criticality: assetCriticalitySchema.default(
      AssetCriticality.MEDIUM,
    ),
    status: assetStatusSchema.default(
      AssetStatus.ACTIVE,
    ),
  })
  .strict();

export const updateAssetSchema = z
  .object({
    name: assetName.optional(),
    type: assetType.optional(),
    location: assetLocation.optional(),
    criticality: assetCriticalitySchema.optional(),
    status: assetStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided.",
  );

export const assetListFiltersSchema = z
  .object({
    status: assetStatusSchema.optional(),
    criticality: assetCriticalitySchema.optional(),
  })
  .strict();

export type CreateAssetInput = z.infer<
  typeof createAssetSchema
>;

export type UpdateAssetInput = z.infer<
  typeof updateAssetSchema
>;

export type AssetListFilters = z.infer<
  typeof assetListFiltersSchema
>;
