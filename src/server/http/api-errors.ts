import { NextResponse } from "next/server";
import { z } from "zod";

import { formatValidationErrors } from "@/src/lib/validation/tickets";
import { AuthorizationError } from "@/src/server/auth/guards";
import {
  AssetNameConflictError,
  AssetNotFoundError,
} from "@/src/server/services/assets";
import { TriageServiceError } from "@/src/server/services/claude";
import {
  NotFoundError,
  WorkflowError,
} from "@/src/server/services/tickets";

/**
 * Converts expected domain failures into controlled JSON API responses.
 *
 * @param error - The failure raised while handling an authenticated API request.
 * @returns A safe JSON response without internal persistence or auth details.
 */
export function toApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        fieldErrors: formatValidationErrors(error),
      },
      { status: 400 },
    );
  }

  if (
    error instanceof AuthorizationError ||
    error instanceof AssetNameConflictError ||
    error instanceof AssetNotFoundError ||
    error instanceof NotFoundError ||
    error instanceof WorkflowError ||
    error instanceof TriageServiceError
  ) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }

  console.error("Unhandled ticket API error", error);

  return NextResponse.json(
    { error: "Unable to complete this request right now." },
    { status: 500 },
  );
}
