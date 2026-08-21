import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/src/server/auth/guards";
import {
  createReporterReview,
  listReporterReviews,
} from "@/src/server/services/reviews";

const reviewSchema = z.object({
  ticketId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const session = await requireRole("REPORTER");
    const reviews = await listReporterReviews(session.user.id);

    return NextResponse.json({ reviews });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load reviews.";

    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("REPORTER");
    const payload = reviewSchema.parse(await request.json());

    const review = await createReporterReview(
      session.user.id,
      payload.ticketId,
      payload.rating,
      payload.comment,
    );

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create review.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
