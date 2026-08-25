import Link from "next/link";
import { AssetCriticality, AssetStatus } from "@prisma/client";

import { requireRole } from "@/src/server/auth/guards";
import { listAssets } from "@/src/server/services/assets";

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

export default async function AssetsPage() {
  const session = await requireRole("ADMIN");

  const assets = await listAssets({
    id: session.user.id,
    role: session.user.role,
  });

  const activeCount = assets.filter(
    (asset) => asset.status === AssetStatus.ACTIVE,
  ).length;

  const criticalCount = assets.filter(
    (asset) => asset.criticality === AssetCriticality.CRITICAL,
  ).length;

  const highCount = assets.filter(
    (asset) => asset.criticality === AssetCriticality.HIGH,
  ).length;

  const retiredCount = assets.filter(
    (asset) => asset.status === AssetStatus.RETIRED,
  ).length;

  return (
    <main className="mx-auto w-full max-w-[1500px] px-6 py-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#303438] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Asset Management
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#edede9]">
            Assets
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#747974]">
            Manage equipment, locations, operational status, and maintenance
            criticality across the facility.
          </p>
        </div>

        <Link
          href="/admin/assets/new"
          className="inline-flex items-center justify-center rounded-md border border-[#555a5d] bg-[#e8e8e3] px-4 py-2.5 text-xs font-bold text-[#17191b] transition hover:bg-white"
        >
          Add Asset
        </Link>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Active", activeCount],
          ["Critical", criticalCount],
          ["High Criticality", highCount],
          ["Retired", retiredCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-[#303438] bg-[#181b1d] p-4"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              {label}
            </p>

            <p className="mt-2 text-2xl font-bold tracking-tight text-[#edede9]">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-[#303438] bg-[#181b1d]">
        <div className="flex flex-col justify-between gap-2 border-b border-[#2d3033] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Asset Registry
            </p>

            <h2 className="mt-1 text-base font-bold text-[#edede9]">
              Equipment Inventory
            </h2>
          </div>

          <span className="rounded-md border border-[#35393c] bg-[#202326] px-2.5 py-1 text-[10px] font-semibold text-[#929792]">
            {assets.length} assets
          </span>
        </div>

        {assets.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-[#c5c8c3]">
              No assets yet
            </p>

            <p className="mt-1 text-xs text-[#686d68]">
              Add the first asset to begin tracking maintenance history.
            </p>

            <Link
              href="/admin/assets/new"
              className="mt-4 inline-flex rounded-md bg-[#e8e8e3] px-4 py-2 text-xs font-bold text-[#17191b]"
            >
              Add Asset
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#292c2e]">
            {assets.map((asset) => (
              <article
                key={asset.id}
                className="px-5 py-4 transition hover:bg-[#1b1e20]"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-[#e4e5e0]">
                        {asset.name}
                      </h3>

                      <span
                        className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${criticalityClasses[asset.criticality]}`}
                      >
                        {formatEnum(asset.criticality)}
                      </span>

                      <span
                        className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${statusClasses[asset.status]}`}
                      >
                        {formatEnum(asset.status)}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[11px] text-[#777c77]">
                      {asset.type} · {asset.location}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs sm:grid-cols-3 xl:w-[420px]">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#606560]">
                        Tickets
                      </p>
                      <p className="mt-1 font-semibold text-[#c5c8c3]">
                        {asset._count.tickets}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#606560]">
                        Maintenance Plans
                      </p>
                      <p className="mt-1 font-semibold text-[#c5c8c3]">
                        {asset._count.maintenancePlans}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#606560]">
                        Location
                      </p>
                      <p className="mt-1 truncate font-semibold text-[#c5c8c3]">
                        {asset.location}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/admin/assets/${asset.id}`}
                    className="shrink-0 rounded-md border border-[#383c3f] bg-[#202326] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#b3b7b2] transition hover:border-[#555a5d] hover:text-[#edede9]"
                  >
                    View Asset
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
