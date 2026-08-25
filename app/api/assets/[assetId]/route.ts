import { NextResponse } from "next/server";

import { requireRole } from "@/src/server/auth/guards";
import {
  AssetNameConflictError,
  AssetNotFoundError,
  getAsset,
  updateAsset,
} from "@/src/server/services/assets";
import {
  assetIdSchema,
  updateAssetSchema,
} from "@/src/lib/validation/assets";

interface RouteContext {
  params: Promise<{
    assetId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await requireRole("ADMIN");
    const { assetId } = await context.params;

    const parsedId = assetIdSchema.safeParse(assetId);

    if (!parsedId.success) {
      return NextResponse.json(
        { error: "Invalid asset ID." },
        { status: 400 },
      );
    }

    const asset = await getAsset(
      {
        id: session.user.id,
        role: session.user.role,
      },
      parsedId.data,
    );

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof AssetNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to load asset." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await requireRole("ADMIN");
    const { assetId } = await context.params;

    const parsedId = assetIdSchema.safeParse(assetId);

    if (!parsedId.success) {
      return NextResponse.json(
        { error: "Invalid asset ID." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = updateAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid asset data.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const asset = await updateAsset(
      {
        id: session.user.id,
        role: session.user.role,
      },
      parsedId.data,
      parsed.data,
    );

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof AssetNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    if (error instanceof AssetNameConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update asset." },
      { status: 500 },
    );
  }
}