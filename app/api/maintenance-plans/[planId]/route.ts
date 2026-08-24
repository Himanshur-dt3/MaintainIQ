import { NextResponse } from "next/server";

import {
  updateMaintenancePlanSchema,
} from "@/src/lib/validation/maintenance-plans";
import { requireUser } from "@/src/server/auth/guards";
import { toApiErrorResponse } from "@/src/server/http/api-errors";
import {
  getMaintenancePlan,
  updateMaintenancePlan,
} from "@/src/server/services/maintenance-plans";

type RouteContext = {
  params: {
    planId: string;
  };
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await requireUser();

    const actor = {
      id: session.user.id,
      role: session.user.role,
    };

    const plan = await getMaintenancePlan(
      actor,
      context.params.planId,
    );

    return NextResponse.json({ plan });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await requireUser();

    const actor = {
      id: session.user.id,
      role: session.user.role,
    };

    const input = updateMaintenancePlanSchema.parse(
      await request.json(),
    );

    const plan = await updateMaintenancePlan(
      actor,
      context.params.planId,
      input,
    );

    return NextResponse.json({ plan });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}