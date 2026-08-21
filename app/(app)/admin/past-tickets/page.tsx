import Link from "next/link";

import { TicketPriorityBadge, TicketStatusBadge } from "@/src/components/ticket-badges";
import { requireRole } from "@/src/server/auth/guards";
import { listAdminTickets } from "@/src/server/services/tickets";

export default async function PastTicketsPage({
  searchParams,
}: {
  searchParams?: { location?: string; q?: string };
}) {
  const session = await requireRole("ADMIN");

  const actor = {
    id: session.user.id,
    role: session.user.role,
  };

  const selectedLocation = searchParams?.location?.trim() ?? "";
  const searchQuery = searchParams?.q?.trim().toLowerCase() ?? "";

  const allTickets = await listAdminTickets(actor, {});

  const locations = Array.from(
    new Set(allTickets.map((ticket) => ticket.location).filter(Boolean)),
  ).sort();

  const tickets = allTickets.filter((ticket) => {
    if (
      selectedLocation &&
      ticket.location !== selectedLocation
    ) {
      return false;
    }

    if (searchQuery) {
      const searchableText = [
        ticket.id,
        ticket.title,
        ticket.location,
        ticket.asset.name,
        ticket.reporter.name,
        ticket.technician?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(searchQuery)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737873]">
            Archive
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#f0f0ec] sm:text-3xl">
            Past Tickets
          </h1>

          <p className="mt-1 text-sm text-[#8e938e]">
            Complete ticket history, including recent and resolved tickets.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-md border border-[#303438] bg-[#181b1d] px-4 py-2 text-xs font-semibold text-[#c9cbc6] transition hover:border-[#555a56] hover:bg-[#202326]"
        >
          ← Dashboard
        </Link>
      </section>

      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-4">
        <form
          method="GET"
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_auto_auto]"
        >
          <div>
            <label
              htmlFor="q"
              className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.15em] text-[#656a65]"
            >
              Search tickets
            </label>

            <input
              id="q"
              name="q"
              defaultValue={searchParams?.q ?? ""}
              placeholder="Search title, ID, asset, reporter..."
              className="w-full rounded-md border border-[#35393c] bg-[#141719] px-3 py-2 text-xs font-semibold text-[#d8d9d4] outline-none placeholder:text-[#555a56] focus:border-[#777c77]"
            />
          </div>

          <div>
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
              className="w-full rounded-md border border-[#35393c] bg-[#141719] px-3 py-2 text-xs font-semibold text-[#d8d9d4] outline-none focus:border-[#777c77]"
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
            className="self-end rounded-md border border-[#555a56] bg-[#d9dad5] px-5 py-2 text-xs font-bold text-[#17191a] transition hover:bg-[#eeeeea]"
          >
            Search
          </button>

          {(selectedLocation || searchQuery) ? (
            <Link
              href="/admin/past-tickets"
              className="self-end rounded-md border border-[#303438] bg-[#202326] px-5 py-2 text-center text-xs font-semibold text-[#9da29d] transition hover:border-[#555a56] hover:text-[#e5e6e1]"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </section>

      <section className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#aeb3ae]">
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
          </p>

          <p className="mt-1 text-[10px] text-[#656a65]">
            All historical tickets are included in this view.
          </p>
        </div>
      </section>

      {tickets.length === 0 ? (
        <section className="rounded-lg border border-dashed border-[#35393c] bg-[#181b1d] px-6 py-16 text-center">
          <h2 className="text-lg font-bold text-[#dfe0db]">
            No tickets found
          </h2>

          <p className="mt-2 text-sm text-[#737873]">
            Try changing the search or location filter.
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

                    <p className="mt-1 truncate font-semibold text-[#c9cbc6]">
                      {ticket.reporter.name}
                    </p>
                  </div>

                  <div className="rounded-md border border-[#303438] bg-[#141719] px-3 py-2">
                    <p className="text-[9px] uppercase tracking-wider text-[#646964]">
                      Technician
                    </p>

                    <p className="mt-1 truncate font-semibold text-[#c9cbc6]">
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
