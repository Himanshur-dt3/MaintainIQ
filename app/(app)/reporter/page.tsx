import type { TicketCardData } from "@/src/components/ticket-card";
import { ReporterTicketIntake } from "@/src/components/reporter-ticket-intake";
import { TicketCard } from "@/src/components/ticket-card";
import {
  AiAnalysisPanel,
  TicketHistoryTimeline,
} from "@/src/components/ticket-detail-panels";
import { requireRole } from "@/src/server/auth/guards";
import {
  getTicketForActor,
  listTicketsForActor,
} from "@/src/server/services/tickets";

type ReporterPageProps = {
  searchParams?: {
    ticket?: string;
  };
};

/**
 * Renders the protected reporter workspace for submitting issues and reviewing
 * tickets owned by the authenticated reporter.
 *
 * @param searchParams - Optional owned ticket identifier to display in detail.
 * @returns The reporter submission workspace and owned-ticket visibility.
 */
export default async function ReporterPage({
  searchParams,
}: ReporterPageProps) {
  const session = await requireRole("REPORTER");
  const actor = { id: session.user.id, role: session.user.role };
  const tickets = await listTicketsForActor(actor);
  const requestedTicketId = searchParams?.ticket;
  const selectedTicket =
    requestedTicketId && tickets.some((ticket) => ticket.id === requestedTicketId)
      ? await getTicketForActor(actor, requestedTicketId)
      : null;

  return (
    <div className="space-y-10 font-sans text-slate-100">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block rounded-full bg-sky-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-sky-400 ring-1 ring-sky-500/30">
            Reporter Portal
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome back, {session.user.name ?? "Reporter"}.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Report a maintenance issue below. Our server-side AI automatically categorizes your request, assigns urgency, and routes it to the right technician team.
          </p>
        </div>
      </section>

      <ReporterTicketIntake />

      <section aria-labelledby="your-tickets-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
              Submitted Requests
            </span>
            <h2
              id="your-tickets-title"
              className="mt-1 font-display text-2xl font-bold text-white"
            >
              Your Tickets
            </h2>
          </div>
          <span className="rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-1.5 text-xs font-bold text-slate-400">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </span>
        </div>

        {tickets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
            <h3 className="font-display text-lg font-bold text-slate-300">
              No reported issues yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              Use the form above to submit your first maintenance request. Track its progress and AI analysis here anytime.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket as TicketCardData}
                detailHref={`/reporter?ticket=${ticket.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {selectedTicket ? (
        <section
          aria-labelledby="ticket-detail-title"
          className="scroll-mt-8 space-y-6 border-t border-slate-800/80 pt-8"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                Ticket Details
              </span>
              <h2
                id="ticket-detail-title"
                className="mt-1 font-display text-2xl font-bold text-white"
              >
                {selectedTicket.title}
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Ticket #{selectedTicket.id.slice(0, 8)}
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AiAnalysisPanel analysis={selectedTicket.aiAnalysis} />
            <TicketHistoryTimeline history={selectedTicket.history} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
