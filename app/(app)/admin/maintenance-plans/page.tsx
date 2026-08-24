import Link from "next/link";

import { requireUser } from "@/src/server/auth/guards";
import {
  getMaintenancePlanSummary,
  listMaintenancePlans,
} from "@/src/server/services/maintenance-plans";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDueState(
  status: string,
  nextDueAt: Date | string,
) {
  if (status === "ACTIVE" && new Date(nextDueAt).getTime() < Date.now()) {
    return "OVERDUE";
  }

  return status;
}

export default async function MaintenancePlansPage() {
  const session = await requireUser();

  const actor = {
    id: session.user.id,
    role: session.user.role,
  };

  const [plans, summary] = await Promise.all([
    listMaintenancePlans(actor),
    getMaintenancePlanSummary(actor),
  ]);

  const statusClasses = {
    ACTIVE: "border-emerald-500/25 bg-emerald-500/[0.05] text-emerald-300",
    PAUSED: "border-amber-500/25 bg-amber-500/[0.05] text-amber-300",
    OVERDUE: "border-red-500/30 bg-red-500/[0.06] text-red-300",
    COMPLETED: "border-sky-500/25 bg-sky-500/[0.05] text-sky-300",
    CANCELLED: "border-[#3a3e41] bg-[#202326] text-[#858a85]",
  } as const;

  const orderedPlans = [...plans].sort((a, b) => {
    const aOverdue =
      a.status === "ACTIVE" &&
      new Date(a.nextDueAt).getTime() < Date.now();

    const bOverdue =
      b.status === "ACTIVE" &&
      new Date(b.nextDueAt).getTime() < Date.now();

    if (aOverdue !== bOverdue) {
      return aOverdue ? -1 : 1;
    }

    return (
      new Date(a.nextDueAt).getTime() -
      new Date(b.nextDueAt).getTime()
    );
  });

  return (
    <main className="mx-auto w-full max-w-[1500px] px-6 py-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#303438] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Maintenance Operations
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#ededE9]">
            Maintenance Plans
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#747974]">
            Manage preventive maintenance schedules, assignments, priorities,
            and upcoming service work across active assets.
          </p>
        </div>

        <Link
          href="/admin/maintenance-plans/new"
          className="inline-flex items-center justify-center rounded-md border border-[#555a5d] bg-[#e8e8e3] px-4 py-2.5 text-xs font-bold text-[#17191b] transition hover:bg-white"
        >
          Create Maintenance Plan
        </Link>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Active", summary.active],
          ["Overdue", summary.overdue],
          ["Paused", summary.paused],
          ["Completed", summary.completed],
          ["Cancelled", summary.cancelled],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-[#303438] bg-[#181b1d] p-4"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              {label}
            </p>

            <p className="mt-2 text-2xl font-bold tracking-tight text-[#ededE9]">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-[#303438] bg-[#181b1d]">
        <div className="flex flex-col justify-between gap-2 border-b border-[#2d3033] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
              Scheduled Work
            </p>

            <h2 className="mt-1 text-base font-bold text-[#ededE9]">
              Maintenance Schedule
            </h2>
          </div>

          <span className="rounded-md border border-[#35393c] bg-[#202326] px-2.5 py-1 text-[10px] font-semibold text-[#929792]">
            {plans.length} plans
          </span>
        </div>

        {orderedPlans.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-[#c5c8c3]">
              No maintenance plans yet
            </p>

            <p className="mt-1 text-xs text-[#686d68]">
              Create the first preventive maintenance plan to start tracking
              scheduled work.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#292c2e]">
            {orderedPlans.map((plan) => {
              const dueState = getDueState(
                plan.status,
                plan.nextDueAt,
              );

              return (
                <article
                  key={plan.id}
                  className="px-5 py-4 transition hover:bg-[#1b1e20]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-[#e4e5e0]">
                          {plan.title}
                        </h3>

                        <span
                          className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${
                            statusClasses[dueState as keyof typeof statusClasses]
                          }`}
                        >
                          {formatEnum(dueState)}
                        </span>

                        <span className="rounded-md border border-[#34383b] bg-[#202326] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#929792]">
                          {formatEnum(plan.priority)}
                        </span>
                      </div>

                      <p className="mt-1.5 text-[11px] text-[#777c77]">
                        {plan.asset.name}
                        {" · "}
                        {plan.asset.location}
                      </p>

                      {plan.description ? (
                        <p className="mt-2 max-w-3xl text-xs leading-5 text-[#969b96]">
                          {plan.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs sm:grid-cols-4 xl:w-[560px]">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#606560]">
                          Type
                        </p>
                        <p className="mt-1 font-semibold text-[#c5c8c3]">
                          {formatEnum(plan.type)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#606560]">
                          Frequency
                        </p>
                        <p className="mt-1 font-semibold text-[#c5c8c3]">
                          {formatEnum(plan.frequency)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#606560]">
                          Next Due
                        </p>
                        <p
                          className={`mt-1 font-semibold ${
                            dueState === "OVERDUE"
                              ? "text-red-300"
                              : "text-[#c5c8c3]"
                          }`}
                        >
                          {formatDate(plan.nextDueAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#606560]">
                          Technician
                        </p>
                        <p className="mt-1 truncate font-semibold text-[#c5c8c3]">
                          {plan.technician?.name ?? "Unassigned"}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/admin/maintenance-plans/${plan.id}`}
                      className="shrink-0 rounded-md border border-[#383c3f] bg-[#202326] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#b3b7b2] transition hover:border-[#555a5d] hover:text-[#ededE9]"
                    >
                      View Plan
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}