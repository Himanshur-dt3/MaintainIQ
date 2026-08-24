import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/server/auth/guards";
import { toApiErrorResponse } from "@/src/server/http/api-errors";
import {
  cancelMaintenancePlan,
  completeMaintenancePlan,
  pauseMaintenancePlan,
  resumeMaintenancePlan,
} from "@/src/server/services/maintenance-plans";

const actionSchema = z.enum([
  "pause",
  "resume",
  "complete",
  "cancel",
]);

type RouteContext = {
  params: {
    planId: string;
    action: string;
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

    const action = actionSchema.parse(
      context.params.action,
    );

    let plan;

    switch (action) {
      case "pause":
        plan = await pauseMaintenancePlan(
          actor,
          context.params.planId,
        );
        break;

      case "resume":
        plan = await resumeMaintenancePlan(
          actor,
          context.params.planId,
        );
        break;

      case "complete":
        plan = await completeMaintenancePlan(
          actor,
          context.params.planId,
        );
        break;

      case "cancel":
        plan = await cancelMaintenancePlan(
          actor,
          context.params.planId,
        );
        break;
    }

    return NextResponse.json({ plan });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}