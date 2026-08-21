import Link from "next/link";
import { notFound } from "next/navigation";
import { ReanalyzeTicketButton } from "@/src/components/reanalyze-ticket-button";

import {
  AiAnalysisPanel,
  TicketHistoryTimeline,
} from "@/src/components/ticket-detail-panels";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/src/components/ticket-badges";
import {
  calculateAssetHealthScore,
  recommendTechnicianDispatch,
} from "@/src/server/services/ai-assistant";
import { requireRole } from "@/src/server/auth/guards";
import {
  getTicketForActor,
  listAdminTickets,
  listTechniciansForAdmin,
} from "@/src/server/services/tickets";

function label(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AdminTicketDetailPage({
  params,
}: {
  params: { ticketId: string };
}) {
  const session = await requireRole("ADMIN");

  const actor = {
    id: session.user.id,
    role: session.user.role,
  };

  const [ticket, technicians, adminTickets] = await Promise.all([
    getTicketForActor(actor, params.ticketId),
    listTechniciansForAdmin(actor),
    listAdminTickets(actor, {}),
  ]);

  if (!ticket) {
    notFound();
  }

  const adminTicket = adminTickets.find((item) => item.id === ticket.id);

  const assetTicketCount = adminTicket?.asset._count?.tickets ?? 1;
  const assetHealth = calculateAssetHealthScore(assetTicketCount);

  const dispatchRecommendation =
    !ticket.technician && ticket.status !== "RESOLVED"
      ? recommendTechnicianDispatch(
          ticket.issueType,
          ticket.priority,
          technicians,
        )
      : null;

  const aiConfidence = ticket.aiAnalysis
    ? Math.round(ticket.aiAnalysis.confidence * 100)
    : null;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Link
            href="/admin/tickets?scope=all"
            className="text-xs font-semibold text-[#8f958f] transition hover:text-[#e2e3de]"
          >
            ← Back to Tickets
          </Link>

          <p className="mt-5 font-mono text-[10px] uppercase tracking-widest text-[#656a65]">
            Ticket #{ticket.id.slice(0, 8)}
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#f0f0ec] sm:text-3xl">
            {ticket.title}
          </h1>

          <p className="mt-1 text-sm text-[#858a85]">
            {ticket.asset.name} · {ticket.location}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
          <ReanalyzeTicketButton ticketId={ticket.id} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-[#303438] bg-[#181b1d] p-4">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#666b66]">
            Issue Type
          </p>
          <p className="mt-2 text-sm font-bold text-[#e1e2dd]">
            {label(ticket.issueType)}
          </p>
        </div>

        <div className="rounded-lg border border-[#303438] bg-[#181b1d] p-4">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#666b66]">
            Reporter
          </p>
          <p className="mt-2 text-sm font-bold text-[#e1e2dd]">
            {ticket.reporter.name}
          </p>
          <p className="mt-1 text-[10px] text-[#747974]">
            {ticket.reporter.email}
          </p>
        </div>

        <div className="rounded-lg border border-[#303438] bg-[#181b1d] p-4">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#666b66]">
            Technician
          </p>
          <p className="mt-2 text-sm font-bold text-[#e1e2dd]">
            {ticket.technician?.name ?? "Unassigned"}
          </p>
          {ticket.technician?.email ? (
            <p className="mt-1 text-[10px] text-[#747974]">
              {ticket.technician.email}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-[#303438] bg-[#181b1d] p-4">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#666b66]">
            Asset Health
          </p>
          <p className="mt-2 text-sm font-bold text-[#e1e2dd]">
            {assetHealth.healthScore}% · {label(assetHealth.riskLevel)}
          </p>
          <p className="mt-1 text-[10px] text-[#747974]">
            {assetTicketCount} related ticket{assetTicketCount === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-6">
            <div className="border-b border-[#2d3033] pb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
                Ticket Information
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#ededE9]">
                Full Details
              </h2>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-[#656a65]">
                  Ticket ID
                </dt>
                <dd className="mt-1 font-mono text-xs text-[#cfd1cc]">
                  {ticket.id}
                </dd>
              </div>

              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-[#656a65]">
                  Location
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#d8d9d4]">
                  {ticket.location}
                </dd>
              </div>

              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-[#656a65]">
                  Asset
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#d8d9d4]">
                  {ticket.asset.name}
                </dd>
              </div>


              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-[#656a65]">
                  Priority
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#d8d9d4]">
                  {label(ticket.priority)}
                </dd>
              </div>

              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-[#656a65]">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#d8d9d4]">
                  {new Date(ticket.updatedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
            </dl>
          </section>

          <AiAnalysisPanel analysis={ticket.aiAnalysis} />

          {dispatchRecommendation ? (
            <section className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
                AI Dispatch Opportunity
              </p>

              <h2 className="mt-1 text-lg font-bold text-white">
                Recommended Technician
              </h2>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-violet-100">
                    {dispatchRecommendation.technicianName}
                  </p>
                  <p className="mt-1 text-xs text-violet-200/70">
                    {dispatchRecommendation.rationale}
                  </p>
                </div>

                <div className="rounded-md border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-violet-200/70">
                    Match
                  </p>
                  <p className="text-xl font-bold text-violet-100">
                    {dispatchRecommendation.matchScore}%
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <TicketHistoryTimeline history={ticket.history} />
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              AI Operations
            </p>

            <h2 className="mt-1 text-lg font-bold text-[#ededE9]">
              Recommended Next Move
            </h2>

            <div className="mt-5 rounded-md border border-[#3a3e41] bg-[#141719] p-4">
              <p className="text-xs font-semibold leading-5 text-[#d7d9d4]">
                {ticket.status === "RESOLVED"
                  ? "Ticket is resolved. Use the AI findings and history for preventive-maintenance review."
                  : !ticket.technician
                    ? "Assign the recommended technician and review the AI suggested action before work begins."
                    : ticket.status === "IN_PROGRESS"
                      ? "Review the latest technician note against the AI suggested action and failure-risk signal."
                      : "Confirm the assignment and move the ticket into active work using the existing workflow."}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2d3033] pb-3">
                <span className="text-[10px] uppercase tracking-wider text-[#666b66]">
                  AI Confidence
                </span>
                <span className="text-sm font-bold text-[#dfe0db]">
                  {aiConfidence !== null ? `${aiConfidence}%` : "Unavailable"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#2d3033] pb-3">
                <span className="text-[10px] uppercase tracking-wider text-[#666b66]">
                  Asset Risk
                </span>
                <span className="text-sm font-bold text-[#dfe0db]">
                  {label(assetHealth.riskLevel)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-[#666b66]">
                  History Events
                </span>
                <span className="text-sm font-bold text-[#dfe0db]">
                  {ticket.history.length}
                </span>
              </div>
            </div>
          </section>

          {ticket.aiAnalysis ? (
            <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
                AI Action
              </p>

              <p className="mt-3 text-sm font-semibold leading-6 text-[#d8d9d4]">
                {ticket.aiAnalysis.suggestedAction}
              </p>

              {ticket.aiAnalysis.possibleCauses.length > 0 ? (
                <>
                  <p className="mt-5 text-[9px] font-bold uppercase tracking-wider text-[#656a65]">
                    Likely Causes
                  </p>

                  <ul className="mt-2 space-y-2">
                    {ticket.aiAnalysis.possibleCauses.map((cause) => (
                      <li
                        key={cause}
                        className="border-l border-[#777c77] pl-3 text-xs leading-5 text-[#aeb3ae]"
                      >
                        {cause}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Asset
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              {ticket.asset.name}
            </h2>

            <p className="mt-1 text-xs text-[#7c817c]">
              {ticket.asset.location}
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#2b2e30]">
              <div
                className="h-full rounded-full bg-[#bfc2bd]"
                style={{ width: `${assetHealth.healthScore}%` }}
              />
            </div>

            <p className="mt-2 text-[10px] text-[#777c77]">
              {assetHealth.preventativeRecommendation}
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}

