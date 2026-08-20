import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/src/auth";

type TicketAccessRecord = {
  reporterId: string;
  technicianId: string | null;
};

export class AuthorizationError extends Error {
  readonly statusCode = 403;

  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Requires a valid server-authenticated user session.
 *
 * @returns The authenticated session with a persisted user identifier and role.
 * @throws {AuthorizationError} When no valid session is available.
 */
export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    throw new AuthorizationError("Authentication is required.");
  }

  return session;
}

/**
 * Requires an authenticated user with one of the permitted persisted roles.
 *
 * @param allowedRoles - Roles that may perform the guarded operation.
 * @returns The authenticated session for an allowed user.
 * @throws {AuthorizationError} When the user's role is not permitted.
 */
export async function requireRole<const AllowedRole extends Role>(
  ...allowedRoles: AllowedRole[]
) {
  const session = await requireUser();

  if (!allowedRoles.includes(session.user.role as AllowedRole)) {
    throw new AuthorizationError();
  }

  return session;
}

/**
 * Verifies that an authenticated user may read or mutate a ticket.
 *
 * Admins can access every ticket, reporters can access only their own tickets,
 * and technicians can access only tickets assigned to them.
 *
 * @param actor - Authenticated actor identity from a server session.
 * @param ticket - Ticket ownership data needed for the access decision.
 * @throws {AuthorizationError} When the actor cannot access the ticket.
 */
export function assertTicketAccess(
  actor: Pick<Awaited<ReturnType<typeof requireUser>>["user"], "id" | "role">,
  ticket: TicketAccessRecord,
): void {
  if (actor.role === "ADMIN") {
    return;
  }

  if (actor.role === "REPORTER" && ticket.reporterId === actor.id) {
    return;
  }

  if (actor.role === "TECHNICIAN" && ticket.technicianId === actor.id) {
    return;
  }

  throw new AuthorizationError();
}

/**
 * Verifies that a technician is assigned to a ticket before a technician-only
 * workflow mutation is allowed.
 *
 * @param actor - Authenticated technician identity from a server session.
 * @param ticket - Ticket assignment data required for the assertion.
 * @throws {AuthorizationError} When the actor is not the assigned technician.
 */
export function assertAssignedTechnician(
  actor: Pick<Awaited<ReturnType<typeof requireUser>>["user"], "id" | "role">,
  ticket: Pick<TicketAccessRecord, "technicianId">,
): void {
  if (actor.role !== "TECHNICIAN" || ticket.technicianId !== actor.id) {
    throw new AuthorizationError(
      "Only the technician assigned to this ticket may perform this action.",
    );
  }
}

/**
 * Redirects an unauthenticated request to the login route, preserving the
 * original destination for post-login navigation.
 *
 * @param callbackUrl - Route to restore after a successful login.
 * @returns The authenticated server session.
 */
export async function requirePageUser(callbackUrl: string) {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return session;
}
