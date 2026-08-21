import Link from "next/link";
import { TicketStatus } from "@prisma/client";

import { TicketPriorityBadge, TicketStatusBadge } from "@/src/components/ticket-badges";
import { requireRole } from "@/src/server/auth/guards";
import { listAdminTickets } from "@/src/server/services/tickets";

type TicketScope = "all" | "open" | "unassigned" | "in-progress";

function scopeLabel(scope: TicketScope): string {
  switch (scope) {
    case "open":
      return "Open Workload";
    case "unassigned":
      return "Unassigned Tickets";
    case "in-progress":
      return "In Progress";
    default:
      return "All Tickets";
  }
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams?: { scope?: string; location?: string };
}) {
  const session = await requireRole("ADMIN");

  const actor = {
    id: session.user.id,
    role: session.user.role,
  };

  const scope: TicketScope =
    searchParams?.scope === "open" ||
    searchParams?.scope === "unassigned" ||
    searchParams?.scope === "in-progress"
      ? searchParams.scope
      : "all";

  const selectedLocation = searchParams?.location?.trim() ?? "";

  const allTickets = await listAdminTickets(actor, {});

  const locations = Array.from(
    new Set(allTickets.map((ticket) => ticket.location).filter(Boolean)),
  ).sort();

  const tickets = allTickets.filter((ticket) => {
    if (scope === "open") {
      return ticket.status !== TicketStatus.RESOLVED;
    }

    if (scope === "unassigned") {
      return !ticket.technician && ticket.status !== TicketStatus.RESOLVED;
    }

    if (scope === "in-progress") {
      return ticket.status === TicketStatus.IN_PROGRESS;
    }

    if (selectedLocation && ticket.location !== selectedLocation) {
      return false;
    }

    return true;
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737873]">
            Operations
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#f0f0ec] sm:text-3xl">
            {scopeLabel(scope)}
          </h1>

          <p className="mt-1 text-sm text-[#8e938e]">
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"} currently in this view.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-md border border-[#303438] bg-[#181b1d] px-4 py-2 text-xs font-semibold text-[#c9cbc6] transition hover:border-[#555a56] hover:bg-[#202326]"
        >
          ← Back to Dashboard
        </Link>
      </section>

      <div className="rounded-lg border border-[#303438] bg-[#181b1d] p-4">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="scope" value={scope} />

          <div className="min-w-0 flex-1">
            <label
              htmlFor="location"
              className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.15em] text-[#656a65]"
            >
              Location
            </label>

            <select
              id="location"
              name="location"
              defaultValue={selectedLocation}
              className="w-full rounded-md border border-[#35393c] bg-[#141719] px-3 py-2 text-xs font-semibold text-[#d8d9d4] outline-none transition focus:border-[#777c77]"
            >
              <option value="">All locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-md border border-[#555a56] bg-[#d9dad5] px-4 py-2 text-xs font-bold text-[#17191a] transition hover:bg-[#eeeeea]"
          >
            Apply
          </button>

          {selectedLocation ? (
            <a
              href={"/admin/tickets?scope=" + scope}
              className="rounded-md border border-[#303438] bg-[#202326] px-4 py-2 text-xs font-semibold text-[#9da29d] transition hover:border-[#555a56] hover:text-[#e5e6e1]"
            >
              Clear
            </a>
          ) : null}
        </form>
      </div>

      <nav className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["open", "Open"],
          ["unassigned", "Unassigned"],
          ["in-progress", "In Progress"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/tickets?scope=${value}`}
            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
              scope === value
                ? "border-[#858a84] bg-[#d9dad5] text-[#17191a]"
                : "border-[#303438] bg-[#181b1d] text-[#969b96] hover:border-[#555a56] hover:text-[#e5e6e1]"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tickets.length === 0 ? (
        <section className="rounded-lg border border-dashed border-[#35393c] bg-[#181b1d] px-6 py-16 text-center">
          <h2 className="text-lg font-bold text-[#dfe0db]">
            No tickets found
          </h2>
          <p className="mt-2 text-sm text-[#737873]">
            There are no tickets matching this dashboard view.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/admin/tickets/${ticket.id}`}
              className="group block rounded-lg border border-[#303438] bg-[#181b1d] p-5 transition duration-200 hover:border-[#666b66] hover:bg-[#1d2022]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-[#666b66]">
                      #{ticket.id.slice(0, 8)}
                    </span>

                    <TicketStatusBadge status={ticket.status} />
                    <TicketPriorityBadge priority={ticket.priority} />
                  </div>

                  <h2 className="mt-2 text-base font-bold text-[#ededE9] group-hover:text-white">
                    {ticket.title}
                  </h2>

                  <p className="mt-1 text-xs text-[#858a85]">
                    {ticket.asset.name} · {ticket.location}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-md border border-[#303438] bg-[#141719] px-3 py-2">
                    <p className="text-[9px] uppercase tracking-wider text-[#646964]">
                      Reporter
                    </p>
                    <p className="mt-1 font-semibold text-[#c9cbc6]">
                      {ticket.reporter.name}
                    </p>
                  </div>

                  <div className="rounded-md border border-[#303438] bg-[#141719] px-3 py-2">
                    <p className="text-[9px] uppercase tracking-wider text-[#646964]">
                      Technician
                    </p>
                    <p className="mt-1 font-semibold text-[#c9cbc6]">
                      {ticket.technician?.name ?? "Unassigned"}
                    </p>
                  </div>

                  <div className="rounded-md border border-[#303438] bg-[#141719] px-3 py-2">
                    <p className="text-[9px] uppercase tracking-wider text-[#646964]">
                      AI
                    </p>
                    <p className="mt-1 font-semibold text-[#c9cbc6]">
                      {ticket.aiAnalysis
                        ? `${Math.round(ticket.aiAnalysis.confidence * 100)}% confidence`
                        : "Not analyzed"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#2d3033] pt-3">
                <span className="text-[10px] uppercase tracking-wider text-[#656a65]">
                  {ticket.issueType.replaceAll("_", " ")}
                </span>

                <span className="text-[10px] font-semibold text-[#aeb3ae] opacity-0 transition group-hover:opacity-100">
                  Open ticket →
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

