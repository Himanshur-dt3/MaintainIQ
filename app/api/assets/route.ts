import { NextResponse } from "next/server";

import { requireRole } from "@/src/server/auth/guards";
import {
  AssetNameConflictError,
  createAsset,
  listAssets,
} from "@/src/server/services/assets";
import { assetListFiltersSchema, createAssetSchema } from "@/src/lib/validation/assets";

export async function GET(request: Request) {
  try {
    const session = await requireRole("ADMIN");

    const url = new URL(request.url);

    const parsedFilters = assetListFiltersSchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      criticality: url.searchParams.get("criticality") ?? undefined,
    });

    if (!parsedFilters.success) {
      return NextResponse.json(
        { error: "Invalid asset filters." },
        { status: 400 },
      );
    }

    const assets = await listAssets(
      {
        id: session.user.id,
        role: session.user.role,
      },
      parsedFilters.data,
    );

    return NextResponse.json({ assets });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to load assets." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("ADMIN");

    const body = await request.json();
    const parsed = createAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid asset data.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const asset = await createAsset(
      {
        id: session.user.id,
        role: session.user.role,
      },
      parsed.data,
    );

    return NextResponse.json(
      { asset },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AssetNameConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create asset." },
      { status: 500 },
    );
  }
}
