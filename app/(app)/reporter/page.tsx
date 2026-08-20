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
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          MaintainIQ · Reporter
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Welcome, {session.user.name ?? "Reporter"}.
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Submit a maintenance issue and follow its status, validated AI triage,
          linked asset, and service history from one place.
        </p>
      </section>

      <ReporterTicketIntake />

      <section aria-labelledby="your-tickets-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
              Reporter-owned records
            </p>
            <h2
              id="your-tickets-title"
              className="mt-2 text-2xl font-bold text-slate-950"
            >
              Your tickets
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </p>
        </div>

        {tickets.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              No reported issues yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Use the form above to create your first maintenance request. Its
              status and AI triage details will appear here after submission.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
          className="scroll-mt-8 border-t border-slate-200 pt-8"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
                Ticket detail
              </p>
              <h2
                id="ticket-detail-title"
                className="mt-2 text-2xl font-bold text-slate-950"
              >
                {selectedTicket.title}
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              Ticket #{selectedTicket.id.slice(0, 8)}
            </p>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <AiAnalysisPanel analysis={selectedTicket.aiAnalysis} />
            <TicketHistoryTimeline history={selectedTicket.history} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
