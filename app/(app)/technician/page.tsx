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
    <div className="space-y-10 font-sans text-slate-100">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block rounded-full bg-indigo-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-indigo-400 ring-1 ring-indigo-500/30">
            Technician Workstation
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome, {session.user.name ?? "Technician"}.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Review assigned maintenance tickets, start work when ready, log progress notes, and complete resolutions with durable audit records.
          </p>
        </div>
      </section>

      <TechnicianTicketWorkspace tickets={tickets} />
    </div>
  );
}
