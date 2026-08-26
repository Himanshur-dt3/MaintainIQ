import { NextResponse } from "next/server";

import { requireUser } from "@/src/server/auth/guards";
import prisma from "@/src/server/db/prisma";
import { AssetStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser();

    if (session.user.role !== "REPORTER") {
      return NextResponse.json(
        { error: "Only reporters may access the reporter asset catalog." },
        { status: 403 },
      );
    }

    const assets = await prisma.asset.findMany({
      where: {
        status: AssetStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Reporter asset catalog error:", error);

    return NextResponse.json(
      { error: "Unable to load assets." },
      { status: 500 },
    );
  }
}
