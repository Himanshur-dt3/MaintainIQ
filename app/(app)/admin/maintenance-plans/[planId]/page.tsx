import { MaintenancePlanActions } from "./maintenance-plan-actions";
import Link from "next/link";

import { requireUser } from "@/src/server/auth/guards";
import { getMaintenancePlan } from "@/src/server/services/maintenance-plans";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
  if (
    status === "ACTIVE" &&
    new Date(nextDueAt).getTime() < Date.now()
  ) {
    return "OVERDUE";
  }

  return status;
}

export default async function MaintenancePlanDetailPage({
  params,
}: {
  params: { planId: string };
}) {
  const session = await requireUser();

  const actor = {
    id: session.user.id,
    role: session.user.role,
  };

  const plan = await getMaintenancePlan(actor, params.planId);

  const displayStatus = getDueState(
    plan.status,
    plan.nextDueAt,
  ) as keyof typeof statusClasses;

  const statusClasses = {
    ACTIVE:
      "border-emerald-500/25 bg-emerald-500/[0.05] text-emerald-300",
    PAUSED:
      "border-amber-500/25 bg-amber-500/[0.05] text-amber-300",
    OVERDUE:
      "border-red-500/30 bg-red-500/[0.06] text-red-300",
    COMPLETED:
      "border-sky-500/25 bg-sky-500/[0.05] text-sky-300",
    CANCELLED:
      "border-[#3a3e41] bg-[#202326] text-[#858a85]",
  } as const;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/admin/maintenance-plans"
          className="text-[11px] font-semibold text-[#858a85] transition hover:text-[#d7d9d4]"
        >
          ← Maintenance Plans
        </Link>

        {plan.status !== "COMPLETED" && plan.status !== "CANCELLED" ? (
          <Link
            href={`/admin/maintenance-plans/${plan.id}/edit`}
            className="rounded-md border border-[#3b4043] bg-[#202326] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#c7cac5] transition hover:border-[#555b5e] hover:bg-[#272a2d]"
          >
            Edit Plan
          </Link>
        ) : null}
      </div>

      <section className="rounded-lg border border-[#303438] bg-[#181b1d]">
        <header className="border-b border-[#303438] p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
                Maintenance Plan
              </p>

              <h1 className="mt-2 text-xl font-bold tracking-tight text-[#ededE9]">
                {plan.title}
              </h1>

              <p className="mt-1 text-xs text-[#777c77]">
                {plan.asset.name} · {plan.asset.location}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-md border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                statusClasses[displayStatus]
              }`}
            >
              {displayStatus}
            </span>
          </div>
        </header>

        <div className="grid gap-px bg-[#303438] md:grid-cols-2">
          <div className="bg-[#181b1d] p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Asset
            </p>
            <p className="mt-2 text-sm font-semibold text-[#dedfd9]">
              {plan.asset.name}
            </p>
            <p className="mt-1 text-[11px] text-[#747974]">
              {plan.asset.type} · {plan.asset.location}
            </p>
          </div>

          <div className="bg-[#181b1d] p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Assigned Technician
            </p>
            <p className="mt-2 text-sm font-semibold text-[#dedfd9]">
              {plan.technician?.name ?? "Unassigned"}
            </p>
            {plan.technician?.jobTitle && (
              <p className="mt-1 text-[11px] text-[#747974]">
                {plan.technician.jobTitle}
              </p>
            )}
          </div>

          <div className="bg-[#181b1d] p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Maintenance Type
            </p>
            <p className="mt-2 text-sm font-semibold text-[#dedfd9]">
              {formatEnum(plan.type)}
            </p>
          </div>

          <div className="bg-[#181b1d] p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Frequency
            </p>
            <p className="mt-2 text-sm font-semibold text-[#dedfd9]">
              {formatEnum(plan.frequency)}
            </p>
          </div>

          <div className="bg-[#181b1d] p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Priority
            </p>
            <p className="mt-2 text-sm font-semibold text-[#dedfd9]">
              {formatEnum(plan.priority)}
            </p>
          </div>

          <div className="bg-[#181b1d] p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
              Next Due
            </p>
            <p className="mt-2 text-sm font-semibold text-[#dedfd9]">
              {formatDate(plan.nextDueAt)}
            </p>
            <p className="mt-1 text-[10px] text-[#747974]">
              {formatDateTime(plan.nextDueAt)}
            </p>
          </div>
        </div>

        <div className="border-t border-[#303438] p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
                Description
              </p>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#aeb3ae]">
                {plan.description || "No description provided."}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#686d68]">
                Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#aeb3ae]">
                {plan.notes || "No notes provided."}
              </p>
            </div>
          </div>
        </div>

        <MaintenancePlanActions
          planId={plan.id}
          status={plan.status}
        />

        <footer className="border-t border-[#303438] bg-[#151819] px-6 py-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-[#666b66]">
            <span>
              Created {formatDateTime(plan.createdAt)}
            </span>

            <span>
              Last updated {formatDateTime(plan.updatedAt)}
            </span>

            <span>
              Last completed {formatDateTime(plan.lastCompletedAt)}
            </span>
          </div>
        </footer>
      </section>
    </main>
  );
}