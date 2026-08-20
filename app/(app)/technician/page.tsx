import { TechnicianTicketWorkspace } from "@/src/components/technician-ticket-workspace";
import { requireRole } from "@/src/server/auth/guards";
import { listTicketsForActor } from "@/src/server/services/tickets";

/**
 * Renders the protected technician workspace with server-scoped assigned work.
 *
 * @returns The authenticated technician workload and lifecycle controls.
 */
export default async function TechnicianPage() {
  const session = await requireRole("TECHNICIAN");
  const tickets = await listTicketsForActor({
    id: session.user.id,
    role: session.user.role,
  });

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          MaintainIQ · Technician
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Welcome, {session.user.name ?? "Technician"}.
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Review your assigned maintenance work, record progress, and capture a
          required resolution note once repair work is complete.
        </p>
      </section>

      <TechnicianTicketWorkspace tickets={tickets} />
    </div>
  );
}
