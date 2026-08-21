import type { Priority, TicketStatus } from "@prisma/client";
import Link from "next/link";

import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/src/components/ticket-badges";

export interface TicketCardData {
  id: string;
  title: string;
  location: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  updatedAt?: Date;
  asset?: {
    name: string;
  };
  reporter?: {
    name: string;
  };
  technician?: {
    name: string;
  } | null;
}

interface TicketCardProps {
  ticket: TicketCardData;
  detailHref?: string;
  showDescription?: boolean;
}

/**
 * Displays compact, role-neutral ticket information for ticket lists.
 *
 * @param ticket - Ticket fields available to the current authorized viewer.
 * @param detailHref - Optional route to a ticket detail view.
 * @param showDescription - Whether to display the ticket description.
 * @returns A semantic ticket summary card.
 */
export function TicketCard({
  ticket,
  detailHref,
  showDescription = false,
}: TicketCardProps) {
  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Ticket #{ticket.id.slice(0, 8)}
          </p>

          <h3 className="mt-1 font-display text-base font-bold text-white">
            {ticket.title}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <TicketPriorityBadge priority={ticket.priority} />
          <TicketStatusBadge status={ticket.status} />
        </div>
      </div>

      {showDescription ? (
        <div className="mt-4 rounded-lg border border-slate-800/50 bg-slate-950/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Description
          </p>

          <p className="mt-1 text-xs leading-5 font-bold text-slate-200">
            {ticket.description}
          </p>
        </div>
      ) : null}

      <dl className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800/50 bg-slate-950/40 p-2.5">
          <dt className="font-semibold text-slate-400">Location</dt>
          <dd className="mt-0.5 font-bold text-slate-200">
            {ticket.location}
          </dd>
        </div>

        <div className="rounded-lg border border-slate-800/50 bg-slate-950/40 p-2.5">
          <dt className="font-semibold text-slate-400">Asset</dt>
          <dd className="mt-0.5 font-bold text-slate-200">
            {ticket.asset?.name ?? "Pending asset"}
          </dd>
        </div>

        {ticket.reporter ? (
          <div className="rounded-lg border border-slate-800/50 bg-slate-950/40 p-2.5">
            <dt className="font-semibold text-slate-400">Reported by</dt>
            <dd className="mt-0.5 font-bold text-slate-200">
              {ticket.reporter.name}
            </dd>
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-800/50 bg-slate-950/40 p-2.5">
          <dt className="font-semibold text-slate-400">Technician</dt>
          <dd className="mt-0.5 font-bold text-slate-200">
            {ticket.technician?.name ?? "Unassigned"}
          </dd>
        </div>
      </dl>
    </>
  );

  if (!detailHref) {
    return (
      <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
        {content}
      </article>
    );
  }

  return (
    <Link
      href={detailHref}
      className="block rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-sky-500/50 hover:shadow-sky-500/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
    >
      {content}
    </Link>
  );
}
