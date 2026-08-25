"use client";

import { useRef, useState } from "react";

type StatusKey = "open" | "inProgress" | "resolved";

type StatusCounts = Record<StatusKey, number>;

type ActivityItem = {
  ticketTitle: string;
  action: string;
  actorName: string;
  createdAt: string | Date;
};

type AdminDashboardAnalyticsProps = {
  counts: StatusCounts;
  recentActivity: ActivityItem[];
};

const STATUS_META: Record<
  StatusKey,
  {
    label: string;
    color: string;
    soft: string;
    description: string;
  }
> = {
  open: {
    label: "Open",
    color: "#60a5fa",
    soft: "bg-[#60a5fa]/10 border-[#60a5fa]/25",
    description: "Reported or assigned tickets awaiting active work.",
  },
  inProgress: {
    label: "In Progress",
    color: "#f59e0b",
    soft: "bg-[#f59e0b]/10 border-[#f59e0b]/25",
    description: "Tickets currently being worked on by maintenance staff.",
  },
  resolved: {
    label: "Resolved",
    color: "#34d399",
    soft: "bg-[#34d399]/10 border-[#34d399]/25",
    description: "Maintenance tickets that have been completed.",
  },
};

function describeDonutArc(
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const toPoint = (angle: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;

    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };

  const start = toPoint(endAngle);
  const end = toPoint(startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
  ].join(" ");
}

function formatActivityDate(value: string | Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return date.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAction(action: string) {
  return action.replaceAll("_", " ").toLowerCase();
}

export function AdminDashboardAnalytics({
  counts,
  recentActivity,
}: AdminDashboardAnalyticsProps) {
  const [hoveredStatus, setHoveredStatus] = useState<StatusKey | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const donutRef = useRef<HTMLDivElement>(null);
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);

  const total = counts.open + counts.inProgress + counts.resolved;

  const openPercent = total ? (counts.open / total) * 100 : 0;
  const inProgressPercent = total ? (counts.inProgress / total) * 100 : 0;

  const inProgressEnd = openPercent + inProgressPercent;

  const statusSegments = [
    {
      key: "open" as const,
      count: counts.open,
      start: 0,
      end: openPercent,
    },
    {
      key: "inProgress" as const,
      count: counts.inProgress,
      start: openPercent,
      end: inProgressEnd,
    },
    {
      key: "resolved" as const,
      count: counts.resolved,
      start: inProgressEnd,
      end: 100,
    },
  ];

  const activeStatus = hoveredStatus
    ? STATUS_META[hoveredStatus]
    : null;

  const activeCount = hoveredStatus ? counts[hoveredStatus] : 0;
  const activePercent = total ? (activeCount / total) * 100 : 0;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      {/* TICKET STATUS */}
      <section className="rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="flex items-start justify-between border-b border-[#2d3033] pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Analytics
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              Ticket Status
            </h2>

            <p className="mt-1 text-[11px] text-[#686d68]">
              Current distribution across all tickets.
            </p>
          </div>

          <span className="rounded-md border border-[#35393c] bg-[#202326] px-2.5 py-1 text-[10px] font-semibold text-[#929792]">
            {total} Total
          </span>
        </div>

        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          {/* DONUT */}
          <div
            ref={donutRef}
            className="relative h-44 w-44 shrink-0"
            onMouseLeave={() => setHoveredStatus(null)}
          >
            <svg
              viewBox="0 0 220 220"
              className="h-full w-full overflow-visible"
              role="img"
              aria-label={`Ticket status distribution: ${counts.open} open, ${counts.inProgress} in progress, ${counts.resolved} resolved`}
            >
              <circle
                cx="110"
                cy="110"
                r="78"
                fill="none"
                stroke="#25282a"
                strokeWidth="42"
              />

              {statusSegments.map((segment) =>
                segment.count > 0 ? (
                  <path
                    key={segment.key}
                    d={describeDonutArc(
                      110,
                      78,
                      segment.start * 3.6,
                      segment.end * 3.6,
                    )}
                    fill="none"
                    stroke={STATUS_META[segment.key].color}
                    strokeWidth={
                      hoveredStatus === segment.key ? "47" : "42"
                    }
                    strokeLinecap="butt"
                    className="cursor-pointer transition-all duration-200"
                    style={{
                      opacity:
                        hoveredStatus && hoveredStatus !== segment.key
                          ? 0.22
                          : 1,
                      filter:
                        hoveredStatus === segment.key
                          ? `drop-shadow(0 0 7px ${STATUS_META[segment.key].color})`
                          : "none",
                    }}
                    onMouseEnter={(event) => {
                      setHoveredStatus(segment.key);

                      if (donutRef.current) {
                        const rect = donutRef.current.getBoundingClientRect();

                        setTooltipPosition({
                          x: event.clientX - rect.left,
                          y: event.clientY - rect.top,
                        });
                      }
                    }}
                    onMouseMove={(event) => {
                      if (donutRef.current) {
                        const rect = donutRef.current.getBoundingClientRect();

                        setTooltipPosition({
                          x: event.clientX - rect.left,
                          y: event.clientY - rect.top,
                        });
                      }
                    }}
                    pathLength="100"
                  />
                ) : null,
              )}

              <circle
                cx="110"
                cy="110"
                r="54"
                fill="#181b1d"
                stroke="#303438"
                strokeWidth="1"
              />

              <text
                x="110"
                y="106"
                textAnchor="middle"
                className="dashboard-donut-total"
              >
                {hoveredStatus ? activeCount : total}
              </text>

              <text
                x="110"
                y="126"
                textAnchor="middle"
                className="dashboard-donut-label"
              >
                {hoveredStatus
                  ? STATUS_META[hoveredStatus].label.toUpperCase()
                  : "TICKETS"}
              </text>
            </svg>

            {activeStatus ? (
              <div
                className="pointer-events-none absolute z-20 w-44 rounded-md border border-[#3b4247] bg-[#111517] p-3 shadow-xl"
                style={{
                  left: tooltipPosition.x + 12,
                  top: tooltipPosition.y + 12,
                  transform: "translate(0, 0)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: activeStatus.color }}
                  />
                  <span className="text-[11px] font-bold text-[#f0f0ec]">
                    {activeStatus.label}
                  </span>
                </div>

                <p className="mt-2 text-lg font-bold text-[#f0f0ec]">
                  {activeCount}{" "}
                  <span className="text-[10px] font-medium text-[#777d78]">
                    tickets
                  </span>
                </p>

                <p className="mt-1 text-[10px] leading-4 text-[#8e938e]">
                  {activePercent.toFixed(1)}% of all tickets
                </p>

                <p className="mt-2 border-t border-[#292e31] pt-2 text-[9px] leading-4 text-[#737873]">
                  {activeStatus.description}
                </p>
              </div>
            ) : null}
          </div>

          {/* LEGEND */}
          <div className="w-full max-w-[280px] space-y-2">
            {statusSegments.map((segment) => {
              const meta = STATUS_META[segment.key];
              const percent = total
                ? (segment.count / total) * 100
                : 0;
              const isHovered = hoveredStatus === segment.key;

              return (
                <button
                  key={segment.key}
                  type="button"
                  onMouseEnter={() => setHoveredStatus(segment.key)}
                  onFocus={() => setHoveredStatus(segment.key)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  onBlur={() => setHoveredStatus(null)}
                  className={`w-full rounded-md border p-3 text-left transition-all duration-200 ${
                    isHovered
                      ? `${meta.soft} shadow-[0_0_18px_rgba(255,255,255,0.03)]`
                      : "border-[#303438] bg-[#151819] hover:border-[#42484d]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />

                      <span className="text-xs font-semibold text-[#d8d9d4]">
                        {meta.label}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-[#f0f0ec]">
                      {segment.count}
                    </span>
                  </div>

                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#25282a]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: meta.color,
                      }}
                    />
                  </div>

                  <p className="mt-1.5 text-[9px] text-[#686d68]">
                    {percent.toFixed(1)}% of tickets
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <aside className="flex min-h-0 flex-col rounded-lg border border-[#303438] bg-[#181b1d] p-5">
        <div className="shrink-0 border-b border-[#2d3033] pb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Activity
          </p>

          <div className="flex items-center justify-between gap-3">
            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              Recent Activity
            </h2>

            <span className="rounded-md border border-[#35393c] bg-[#202326] px-2 py-1 text-[9px] font-semibold text-[#737873]">
              {recentActivity.length} events
            </span>
          </div>
        </div>

        <div
          className="mt-4 max-h-[360px] min-h-0 overflow-y-auto pr-2"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#3b4247 transparent",
          }}
        >
          <ul className="space-y-1">
            {recentActivity.length === 0 ? (
              <li className="rounded-md border border-dashed border-[#35393c] p-4 text-xs text-[#6f746f]">
                No recent activity yet.
              </li>
            ) : (
              recentActivity.map((event, index) => (
                <li
                  key={`${event.ticketTitle}-${event.createdAt}-${index}`}
                  className="list-none"
                >
                  <button
                    type="button"
                    aria-pressed={selectedActivity === index}
                    onClick={() =>
                      setSelectedActivity((current) =>
                        current === index ? null : index,
                      )
                    }
                    className={`group w-full rounded-md border px-2 py-3 text-left transition-all duration-150 focus:outline-none ${
                      selectedActivity === index
                        ? "border-[#3b4650] bg-[#202326]"
                        : "border-transparent hover:border-[#30383d] hover:bg-[#202326]"
                    }`}
                    title={`${event.actorName} ${formatAction(event.action)} ${event.ticketTitle}.`}
                  >
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#343a3e] bg-[#202427] text-[9px] font-bold text-[#aeb4b0] transition group-hover:border-[#4a5359] group-hover:text-[#e2e5e1]">
                      {event.actorName.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-[#cfd2cd]">
                        {event.actorName}
                      </p>

                      <p className="mt-0.5 text-[10px] leading-4 text-[#777d78]">
                        {formatAction(event.action)} on{" "}
                        <span className="font-semibold text-[#aeb3ae]">
                          {event.ticketTitle}
                        </span>
                      </p>

                      <p className="mt-1 text-[9px] text-[#555b57]">
                        {formatActivityDate(event.createdAt)}
                      </p>
                    </div>

                    <span className="mt-1 text-[10px] text-[#555b57] transition group-hover:translate-y-0.5 group-hover:text-[#8c9490]">
                      ↓
                    </span>
                  </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </aside>
    </section>
  );
}
