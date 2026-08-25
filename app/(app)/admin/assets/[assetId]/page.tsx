import Link from "next/link";
import { AssetCriticality, AssetStatus } from "@prisma/client";

import { requireRole } from "@/src/server/auth/guards";
import { getAsset } from "@/src/server/services/assets";
import { getAssetHistoricalRepairInsight } from "@/src/server/services/historical-repair-intelligence";

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const criticalityClasses: Record<AssetCriticality, string> = {
  LOW: "border-[#35393c] bg-[#202326] text-[#9da29d]",
  MEDIUM: "border-sky-500/25 bg-sky-500/[0.05] text-sky-300",
  HIGH: "border-amber-500/25 bg-amber-500/[0.05] text-amber-300",
  CRITICAL: "border-red-500/30 bg-red-500/[0.06] text-red-300",
};

const statusClasses: Record<AssetStatus, string> = {
  ACTIVE: "border-emerald-500/25 bg-emerald-500/[0.05] text-emerald-300",
  INACTIVE: "border-amber-500/25 bg-amber-500/[0.05] text-amber-300",
  RETIRED: "border-[#3a3e41] bg-[#202326] text-[#858a85]",
};

interface AssetPageProps {
  params: Promise<{
    assetId: string;
  }>;
}

export default async function AssetPage({ params }: AssetPageProps) {
  const session = await requireRole("ADMIN");
  const { assetId } = await params;

  const [asset, historicalRepairInsight] = await Promise.all([
    getAsset(
      {
        id: session.user.id,
        role: session.user.role,
      },
      assetId,
    ),
    getAssetHistoricalRepairInsight(assetId),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#303438] pb-6 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/admin/assets"
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#737873] transition hover:text-[#d1d3ce]"
          >
            â† Back to Assets
          </Link>

          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Asset Management
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#edede9]">
            {asset.name}
          </h1>

          <p className="mt-2 text-xs text-[#747974]">
            {asset.type} Â· {asset.location}
          </p>
        </div>

        <Link
          href={`/admin/assets/${asset.id}/edit`}
          className="inline-flex items-center justify-center rounded-md border border-[#555a5d] bg-[#e8e8e3] px-4 py-2.5 text-xs font-bold text-[#17191b] transition hover:bg-white"
        >
          Edit Asset
        </Link>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#303438] bg-[#181b1d] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
            Criticality
          </p>
          <span
            className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${criticalityClasses[asset.criticality]}`}
          >
            {formatEnum(asset.criticality)}
          </span>
        </div>

        <div className="rounded-lg border border-[#303438] bg-[#181b1d] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
            Status
          </p>
          <span
            className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${statusClasses[asset.status]}`}
          >
            {formatEnum(asset.status)}
          </span>
        </div>

        <div className="rounded-lg border border-[#303438] bg-[#181b1d] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
            Tickets
          </p>
          <p className="mt-2 text-2xl font-bold text-[#edede9]">
            {asset._count.tickets}
          </p>
        </div>

        <div className="rounded-lg border border-[#303438] bg-[#181b1d] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
            Maintenance Plans
          </p>
          <p className="mt-2 text-2xl font-bold text-[#edede9]">
            {asset._count.maintenancePlans}
          </p>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-[#303438] bg-[#181b1d]">
        <div className="border-b border-[#2d3033] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
                Historical Repair Intelligence
              </p>
              <p className="mt-1 text-xs text-[#686d68]">
                Evidence derived from resolved repairs associated with this asset.
              </p>
            </div>

            <span
              className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${
                historicalRepairInsight.riskLevel === "HIGH"
                  ? "border-red-500/30 bg-red-500/[0.06] text-red-300"
                  : historicalRepairInsight.riskLevel === "MEDIUM"
                    ? "border-amber-500/25 bg-amber-500/[0.05] text-amber-300"
                    : "border-emerald-500/25 bg-emerald-500/[0.05] text-emerald-300"
              }`}
            >
              {historicalRepairInsight.riskLevel} recurrence risk
            </span>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-[#303438] bg-[#202326] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Resolved Repairs
            </p>
            <p className="mt-2 text-2xl font-bold text-[#edede9]">
              {historicalRepairInsight.totalResolvedRepairs}
            </p>
          </div>

          <div className="rounded-md border border-[#303438] bg-[#202326] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Recurring Issue
            </p>
            <p className="mt-2 text-sm font-bold text-[#d9dad5]">
              {historicalRepairInsight.recurringIssueType
                ? formatEnum(historicalRepairInsight.recurringIssueType)
                : "No recurring pattern"}
            </p>
          </div>

          <div className="rounded-md border border-[#303438] bg-[#202326] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Recurrence Rate
            </p>
            <p className="mt-2 text-2xl font-bold text-[#edede9]">
              {historicalRepairInsight.recurrenceRate}%
            </p>
          </div>

          <div className="rounded-md border border-[#303438] bg-[#202326] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Pattern Count
            </p>
            <p className="mt-2 text-2xl font-bold text-[#edede9]">
              {historicalRepairInsight.recurringIssueCount}
            </p>
          </div>
        </div>

        <div className="border-t border-[#2d3033] px-5 py-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
            Recommendation
          </p>
          <p className="mt-2 max-w-4xl text-xs leading-5 text-[#aeb2ad]">
            {historicalRepairInsight.recommendation}
          </p>
        </div>

        {historicalRepairInsight.commonResolutions.length > 0 && (
          <div className="border-t border-[#2d3033] px-5 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Recent Resolution Evidence
            </p>

            <div className="mt-3 space-y-2">
              {historicalRepairInsight.commonResolutions.map(
                (resolution, index) => (
                  <div
                    key={`${resolution}-${index}`}
                    className="rounded-md border border-[#303438] bg-[#202326] px-3 py-2 text-xs text-[#aeb2ad]"
                  >
                    {resolution}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-[#303438] bg-[#181b1d]">
          <div className="border-b border-[#2d3033] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Recent Tickets
            </p>
          </div>

          {asset.tickets.length === 0 ? (
            <p className="px-5 py-8 text-xs text-[#686d68]">
              No tickets are associated with this asset.
            </p>
          ) : (
            <div className="divide-y divide-[#292c2e]">
              {asset.tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/tickets/${ticket.id}`}
                  className="block px-5 py-4 transition hover:bg-[#1b1e20]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#d9dad5]">
                        {ticket.title}
                      </p>
                      <p className="mt-1 text-[10px] text-[#686d68]">
                        {formatEnum(ticket.priority)} Â·{" "}
                        {formatEnum(ticket.status)}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] text-[#686d68]">
                      View
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-[#303438] bg-[#181b1d]">
          <div className="border-b border-[#2d3033] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Maintenance Plans
            </p>
          </div>

          {asset.maintenancePlans.length === 0 ? (
            <p className="px-5 py-8 text-xs text-[#686d68]">
              No maintenance plans are associated with this asset.
            </p>
          ) : (
            <div className="divide-y divide-[#292c2e]">
              {asset.maintenancePlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/admin/maintenance-plans/${plan.id}`}
                  className="block px-5 py-4 transition hover:bg-[#1b1e20]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#d9dad5]">
                        {plan.title}
                      </p>
                      <p className="mt-1 text-[10px] text-[#686d68]">
                        {formatEnum(plan.priority)} Â·{" "}
                        {formatEnum(plan.status)}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] text-[#686d68]">
                      View
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
