import type { Priority, TicketStatus } from "@prisma/client";
import Link from "next/link";

import { TicketPriorityBadge, TicketStatusBadge } from "@/src/components/ticket-badges";

export interface TicketCardData {
  id: string;
  title: string;
  location: string;
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
}

/**
 * Displays compact, role-neutral ticket information for ticket lists.
 *
 * @param ticket - Ticket fields available to the current authorized viewer.
 * @param detailHref - Optional route to a future detail view.
 * @returns A semantic ticket summary card.
 */
export function TicketCard({ ticket, detailHref }: TicketCardProps) {
  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Ticket #{ticket.id.slice(0, 8)}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">
            {ticket.title}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <TicketPriorityBadge priority={ticket.priority} />
          <TicketStatusBadge status={ticket.status} />
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Location</dt>
          <dd className="mt-0.5 text-slate-800">{ticket.location}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Asset</dt>
          <dd className="mt-0.5 text-slate-800">{ticket.asset?.name ?? "Pending asset"}</dd>
        </div>
        {ticket.reporter ? (
          <div>
            <dt className="font-medium text-slate-500">Reported by</dt>
            <dd className="mt-0.5 text-slate-800">{ticket.reporter.name}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-medium text-slate-500">Assigned technician</dt>
          <dd className="mt-0.5 text-slate-800">
            {ticket.technician?.name ?? "Not assigned"}
          </dd>
        </div>
      </dl>
    </>
  );

  if (!detailHref) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {content}
      </article>
    );
  }

  return (
    <Link
      href={detailHref}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2"
    >
      {content}
    </Link>
  );
}
