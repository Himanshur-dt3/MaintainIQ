import { NextResponse } from "next/server";

import { requireRole } from "@/src/server/auth/guards";
import { toApiErrorResponse } from "@/src/server/http/api-errors";
import { askMaintenanceCopilot } from "@/src/server/services/maintenance-copilot";

export async function POST(request: Request) {
  try {
    const session = await requireRole("ADMIN");

    const body = (await request.json()) as {
      question?: unknown;
    };

    if (typeof body.question !== "string") {
      return NextResponse.json(
        { error: "A maintenance question is required." },
        { status: 400 },
      );
    }

    const result = await askMaintenanceCopilot(
      {
        id: session.user.id,
        role: session.user.role,
      },
      body.question,
    );

    return NextResponse.json(result);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
