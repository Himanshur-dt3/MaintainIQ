import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/src/server/auth/guards";
import { listTechniciansForAdmin } from "@/src/server/services/tickets";
import { getMaintenancePlan } from "@/src/server/services/maintenance-plans";
import MaintenancePlanEditForm from "./maintenance-plan-edit-form";

export default async function EditMaintenancePlanPage({
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

  if (
    plan.status === "COMPLETED" ||
    plan.status === "CANCELLED"
  ) {
    redirect(`/admin/maintenance-plans/${plan.id}`);
  }

  const technicians = await listTechniciansForAdmin(actor);

  return (
    <main className="mx-auto w-full max-w-[1000px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={`/admin/maintenance-plans/${plan.id}`}
          className="text-[11px] font-semibold text-[#858a85] transition hover:text-[#d7d9d4]"
        >
          ← Maintenance Plan
        </Link>
      </div>

      <section className="rounded-lg border border-[#303438] bg-[#181b1d]">
        <header className="border-b border-[#303438] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#737873]">
            Maintenance Operations
          </p>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-[#ededE9]">
            Edit Maintenance Plan
          </h1>

          <p className="mt-1 text-xs text-[#777c77]">
            {plan.asset.name} · {plan.asset.location}
          </p>
        </header>

        <MaintenancePlanEditForm plan={plan} technicians={technicians} />
      </section>
    </main>
  );
}