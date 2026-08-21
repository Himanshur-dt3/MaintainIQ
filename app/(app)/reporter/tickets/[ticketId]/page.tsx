import Link from "next/link";
import { notFound } from "next/navigation";

import {
  TicketHistoryTimeline,
} from "@/src/components/ticket-detail-panels";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/src/components/ticket-badges";
import { requireRole } from "@/src/server/auth/guards";
import { getTicketForActor } from "@/src/server/services/tickets";

function label(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function ReporterTicketDetailPage({
  params,
}: {
  params: { ticketId: string };
}) {
  const session = await requireRole("REPORTER");

  const actor = {
    id: session.user.id,
    role: session.user.role,
  };

  const ticket = await getTicketForActor(actor, params.ticketId);

  if (!ticket) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-[#26394a] bg-gradient-to-br from-[#111d27] via-[#111719] to-[#111315] px-6 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[#0ea5e9]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full bg-[#3b82f6]/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/reporter"
            className="text-xs font-semibold text-[#60a5fa] transition hover:text-[#93c5fd]"
          >
            ← Back to Your Tickets
          </Link>

          <div className="mt-5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.7)]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#60a5fa]">
              Ticket Details
            </p>
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#f4f4f0]">
            {ticket.title}
          </h1>

          <p className="mt-1 font-mono text-[10px] text-[#686d68]">
            #{ticket.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TicketPriorityBadge priority={ticket.priority} />
          <TicketStatusBadge status={ticket.status} />
        </div>
      </div>
      </div>

      {/* BASIC DETAILS */}
      <section className="rounded-xl border border-[#303438] bg-[#181b1d] p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#303438] bg-[#111315] p-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#686d68]">
              Location
            </p>
            <p className="mt-1 text-sm font-semibold text-[#dedfd9]">
              {ticket.location}
            </p>
          </div>

          <div className="rounded-lg border border-[#303438] bg-[#111315] p-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#686d68]">
              Asset
            </p>
            <p className="mt-1 text-sm font-semibold text-[#dedfd9]">
              {ticket.asset.name}
            </p>
          </div>

          <div className="rounded-lg border border-[#303438] bg-[#111315] p-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#686d68]">
              Issue Type
            </p>
            <p className="mt-1 text-sm font-semibold text-[#dedfd9]">
              {label(ticket.issueType)}
            </p>
          </div>

          <div className="rounded-lg border border-[#303438] bg-[#111315] p-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#686d68]">
              Technician
            </p>
            <p className="mt-1 text-sm font-semibold text-[#dedfd9]">
              {ticket.technician?.name ?? "Not assigned"}
            </p>
          </div>
        </div>
      </section>

      {/* DESCRIPTION */}
      <section className="rounded-xl border border-[#303438] bg-[#181b1d] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
          Reported Issue
        </p>

        <h2 className="mt-1 text-base font-bold text-[#ededE9]">
          Description
        </h2>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#aeb3ae]">
          {ticket.description}
        </p>
      </section>

      {/* HISTORY */}
      <TicketHistoryTimeline history={ticket.history} />

      {/* RESOLUTION */}
      {ticket.resolutionNotes ? (
        <section className="rounded-xl border border-[#34d399]/30 bg-[#10251f] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#34d399]">
            Resolution
          </p>

          <h2 className="mt-1 text-base font-bold text-[#ededE9]">
            Resolution Notes
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#aeb3ae]">
            {ticket.resolutionNotes}
          </p>
        </section>
      ) : null}
    </div>
  );
}



