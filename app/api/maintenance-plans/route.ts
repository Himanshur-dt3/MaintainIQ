import { NextResponse } from "next/server";

import {
  createMaintenancePlanSchema,
  maintenancePlanListFiltersSchema,
} from "@/src/lib/validation/maintenance-plans";
import { requireUser } from "@/src/server/auth/guards";
import { toApiErrorResponse } from "@/src/server/http/api-errors";
import {
  createMaintenancePlan,
  getMaintenancePlanSummary,
  listMaintenancePlans,
} from "@/src/server/services/maintenance-plans";

export async function GET(request: Request) {
  try {
    const session = await requireUser();

    const actor = {
      id: session.user.id,
      role: session.user.role,
    };

    const url = new URL(request.url);

    const filters = maintenancePlanListFiltersSchema.parse({
      assetId: url.searchParams.get("assetId") || undefined,
      technicianId: url.searchParams.get("technicianId") || undefined,
      status: url.searchParams.get("status") || undefined,
      priority: url.searchParams.get("priority") || undefined,
      type: url.searchParams.get("type") || undefined,
      frequency: url.searchParams.get("frequency") || undefined,
      dueBefore: url.searchParams.get("dueBefore") || undefined,
    });

    const [plans, summary] = await Promise.all([
      listMaintenancePlans(actor, filters),
      getMaintenancePlanSummary(actor),
    ]);

    return NextResponse.json({
      plans,
      summary,
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser();

    const actor = {
      id: session.user.id,
      role: session.user.role,
    };

    const input = createMaintenancePlanSchema.parse(
      await request.json(),
    );

    const plan = await createMaintenancePlan(actor, input);

    return NextResponse.json(
      { plan },
      { status: 201 },
    );
  } catch (error) {
    return toApiErrorResponse(error);
  }
}