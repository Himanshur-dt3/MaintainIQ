import { NextResponse } from "next/server";

import { requireUser } from "@/src/server/auth/guards";
import { toApiErrorResponse } from "@/src/server/http/api-errors";
import { completeMaintenancePlanForTechnician } from "@/src/server/services/maintenance-plans";

type RouteContext = {
  params: {
    planId: string;
  };
};

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await requireUser();

    const actor = {
      id: session.user.id,
      role: session.user.role,
    };

    const plan = await completeMaintenancePlanForTechnician(
      actor,
      context.params.planId,
    );

    return NextResponse.json({ plan });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
