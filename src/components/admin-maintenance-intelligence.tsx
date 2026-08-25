"use client";

import { useState } from "react";
import Link from "next/link";

interface MaintenanceInsight {
  assetId: string;
  assetName: string;
  assetType: string;
  location: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  healthScore: number;
  priorityScore: number;
  recommendation: string;
}

interface MaintenanceAiBrief {
  headline: string;
  summary: string;
  priorityAsset: string;
  priorityReason: string;
  recommendedAction: string;
  systemicPattern: string;
}

interface AdminMaintenanceIntelligenceProps {
  insights: MaintenanceInsight[];
  aiBrief: MaintenanceAiBrief;
}

const riskStyles = {
  LOW: {
    badge: "border-sky-500/25 bg-sky-500/10 text-sky-300",
    dot: "bg-sky-400",
    accent: "border-l-sky-400",
  },
  MEDIUM: {
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
    accent: "border-l-amber-400",
  },
  HIGH: {
    badge: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    dot: "bg-orange-400",
    accent: "border-l-orange-400",
  },
  CRITICAL: {
    badge: "border-red-500/30 bg-red-500/10 text-red-300",
    dot: "bg-red-400",
    accent: "border-l-red-400",
  },
} as const;

function scoreClass(score: number, inverse = false) {
  if (inverse) {
    if (score >= 75) return "text-emerald-300";
    if (score >= 50) return "text-amber-300";
    return "text-red-300";
  }

  if (score >= 75) return "text-red-300";
  if (score >= 50) return "text-amber-300";
  return "text-sky-300";
}

export function AdminMaintenanceIntelligence({
  insights,
  aiBrief,
}: AdminMaintenanceIntelligenceProps) {
  const [selectedAssetId, setSelectedAssetId] = useState(
    insights[0]?.assetId ?? "",
  );

  const selectedInsight =
    insights.find((item) => item.assetId === selectedAssetId) ?? insights[0];

  if (!selectedInsight) {
    return (
      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="border-b border-[#2d3033] pb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Maintenance Intelligence
          </p>
          <h2 className="mt-1 text-base font-bold text-[#ededE9]">
            Priority Assets
          </h2>
        </div>

        <div className="mt-4 rounded-md border border-dashed border-[#35393c] px-4 py-8 text-center">
          <p className="text-sm font-semibold text-[#d8d9d4]">
            No maintenance risks detected
          </p>
          <p className="mt-1 text-[10px] text-[#686d68]">
            Current asset activity does not indicate elevated risk.
          </p>
        </div>
      </section>
    );
  }

  const selectedRisk = riskStyles[selectedInsight.riskLevel];

  const selectedSummary =
    selectedInsight.assetId === insights[0]?.assetId
      ? aiBrief.summary
      : `${selectedInsight.assetName} currently has a ${selectedInsight.riskLevel.toLowerCase()} maintenance risk with a priority score of ${selectedInsight.priorityScore}/100 and a health score of ${selectedInsight.healthScore}/100. Review the recommended action below and continue monitoring the asset for changes.`;

  const selectedHeadline =
    selectedInsight.assetId === insights[0]?.assetId
      ? aiBrief.headline
      : `${selectedInsight.assetName} requires maintenance attention`;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
      {/* PRIORITY ASSETS */}
      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="flex items-start justify-between gap-4 border-b border-[#2d3033] pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Maintenance Intelligence
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              Priority Assets
            </h2>

            <p className="mt-1 text-[11px] text-[#686d68]">
              Select an asset to inspect its maintenance intelligence.
            </p>
          </div>

          <span className="shrink-0 rounded-md border border-[#24415a] bg-[#102131] px-2.5 py-1.5 text-[10px] font-semibold text-sky-300">
            {insights.filter((item) => item.riskLevel !== "LOW").length} at risk
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {insights.slice(0, 5).map((insight) => {
            const risk = riskStyles[insight.riskLevel];
            const isSelected = insight.assetId === selectedInsight.assetId;

            return (
              <button
                key={insight.assetId}
                type="button"
                onClick={() => setSelectedAssetId(insight.assetId)}
                aria-pressed={isSelected}
                className={`group w-full rounded-md border border-l-2 px-4 py-3 text-left transition-all duration-150 ${
                  isSelected
                    ? `${risk.accent} border-[#315b78] bg-[#101f2b] shadow-[inset_0_0_0_1px_rgba(76,170,220,0.08)]`
                    : "border-[#292d2f] border-l-[#303438] bg-[#17191b] hover:border-[#3d4c55] hover:bg-[#1b2023]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${risk.dot}`}
                      />

                      <h3
                        className={`truncate text-sm font-bold ${
                          isSelected
                            ? "text-[#f1f5f4]"
                            : "text-[#e1e3df]"
                        }`}
                      >
                        {insight.assetName}
                      </h3>

                      <span
                        className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${risk.badge}`}
                      >
                        {insight.riskLevel}
                      </span>

                      {isSelected ? (
                        <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-sky-300">
                          Selected
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 truncate text-[10px] text-[#707570]">
                      {insight.assetType} - {insight.location}
                    </p>
                  </div>

                  <div className="hidden shrink-0 items-center gap-6 sm:flex">
                    <div className="w-16">
                      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#686d68]">
                        Health
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-bold ${scoreClass(
                          insight.healthScore,
                          true,
                        )}`}
                      >
                        {insight.healthScore}
                        <span className="ml-1 text-[9px] font-normal text-[#686d68]">
                          /100
                        </span>
                      </p>
                    </div>

                    <div className="w-14">
                      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#686d68]">
                        Priority
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-bold ${scoreClass(
                          insight.priorityScore,
                        )}`}
                      >
                        {insight.priorityScore}
                      </p>
                    </div>

                    <span className="text-[#4e5558] transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </div>
                </div>

                <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#25292b]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      insight.priorityScore >= 75
                        ? "bg-orange-400"
                        : insight.priorityScore >= 50
                          ? "bg-amber-400"
                          : "bg-sky-400"
                    }`}
                    style={{ width: `${Math.max(insight.priorityScore, 4)}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-[9px] text-[#777c77]">
                    {insight.recommendation}
                  </p>

                  <span className="shrink-0 text-[9px] font-semibold text-[#66747b] sm:hidden">
                    View details
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end border-t border-[#292d2f] pt-3">
          <Link
            href="/admin/assets"
            className="text-[10px] font-semibold text-sky-300 transition hover:text-sky-200"
          >
            View all assets →
          </Link>
        </div>
      </section>

      {/* AI OPERATIONS BRIEF */}
      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="border-b border-[#2d3033] pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
                  AI Operations Brief
                </p>

                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-sky-300">
                  AI Insight
                </span>
              </div>

              <h2 className="mt-2 text-base font-bold leading-snug text-[#ededE9]">
                {selectedHeadline}
              </h2>
            </div>

            <span
              className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${selectedRisk.badge}`}
            >
              {selectedInsight.riskLevel}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-md border border-sky-500/10 bg-sky-500/[0.04] px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-sky-300">
              Selected asset
            </span>
            <span className="truncate text-[10px] text-[#aeb3ae]">
              {selectedInsight.assetName}
            </span>
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-[#929792]">
          {selectedSummary}
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-[#303438] bg-[#151819] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#686d68]">
                Priority Asset
              </p>

              <span className="text-[9px] font-semibold text-[#737b78]">
                Priority {selectedInsight.priorityScore}/100
              </span>
            </div>

            <p className="mt-1 text-sm font-bold text-[#e6e7e2]">
              {selectedInsight.assetName}
            </p>

            <p className="mt-1 text-[10px] text-[#777c77]">
              {selectedInsight.assetType} - {selectedInsight.location}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-[#2b3032] bg-[#191c1e] px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#686d68]">
                  Health
                </p>
                <p
                  className={`mt-1 text-sm font-bold ${scoreClass(
                    selectedInsight.healthScore,
                    true,
                  )}`}
                >
                  {selectedInsight.healthScore}
                  <span className="ml-1 text-[9px] font-normal text-[#686d68]">
                    /100
                  </span>
                </p>
              </div>

              <div className="rounded-md border border-[#2b3032] bg-[#191c1e] px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#686d68]">
                  Risk
                </p>
                <p className={`mt-1 text-sm font-bold ${selectedRisk.badge.split(" ").pop()}`}>
                  {selectedInsight.riskLevel}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-amber-500/15 bg-amber-500/[0.035] p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-amber-300/70">
              Recommended Action
            </p>

            <p className="mt-1 text-[10px] leading-relaxed text-[#c1c5c0]">
              {selectedInsight.recommendation}
            </p>

            {selectedInsight.assetId === insights[0]?.assetId ? (
              <p className="mt-2 border-t border-amber-500/10 pt-2 text-[9px] leading-relaxed text-[#777c77]">
                {aiBrief.recommendedAction}
              </p>
            ) : null}
          </div>

          <div className="rounded-md border border-violet-500/10 bg-violet-500/[0.025] p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-sky-300/70">
              System Pattern
            </p>

            <p className="mt-1 text-[10px] leading-relaxed text-[#aeb3ae]">
              {aiBrief.systemicPattern}
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
